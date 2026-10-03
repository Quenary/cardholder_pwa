"""Tests for how accounts are identified: the token subject and the
uniqueness of usernames and emails."""

import pytest
import pytest_asyncio
from fastapi import HTTPException
from jose import jwt
from sqlalchemy.ext.asyncio import AsyncSession

from backend.config import Config
from backend.core.auth_core import create_access_token, is_creds_taken, is_user
from backend.db.models.user_model import UserModel
from backend.db.models.user_role_model import UserRoleModel
from backend.enums.user_role_enum import EUserRole


@pytest_asyncio.fixture
async def session(db: AsyncSession) -> AsyncSession:
    for role in EUserRole:
        db.add(UserRoleModel(code=role))
    db.add(
        UserModel(
            id=1, username="Alice", email="Alice@Example.com", hashed_password="x"
        )
    )
    await db.commit()
    return db


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("username", "email"),
    [("alice", "other@example.com"), ("bob", "alice@example.com"), ("ALICE", "x@y.z")],
)
async def test_creds_are_taken_whatever_the_case(
    session: AsyncSession, username: str, email: str
) -> None:
    assert await is_creds_taken(session, username, email, None) is True


@pytest.mark.asyncio
async def test_creds_are_free_for_the_account_that_owns_them(
    session: AsyncSession,
) -> None:
    assert await is_creds_taken(session, "alice", "ALICE@example.com", 1) is False
    assert await is_creds_taken(session, "bob", "bob@example.com", None) is False


@pytest.mark.asyncio
async def test_token_subject_is_the_user_id(session: AsyncSession) -> None:
    token, _ = create_access_token({"sub": "1"})
    user = await is_user(token, session)
    assert user.username == "Alice"


@pytest.mark.asyncio
async def test_renamed_account_keeps_its_token_and_the_old_name_gets_none(
    session: AsyncSession,
) -> None:
    token, _ = create_access_token({"sub": "1"})
    user = await is_user(token, session)
    user.username = "Alicia"
    await session.commit()
    session.add(
        UserModel(id=2, username="Alice", email="new@example.com", hashed_password="x")
    )
    await session.commit()

    assert (await is_user(token, session)).id == 1


@pytest.mark.asyncio
@pytest.mark.parametrize("subject", ["Alice", "abc", "-1", "1.5", "²", "99", ""])
async def test_token_with_another_kind_of_subject_is_refused(
    session: AsyncSession, subject: str
) -> None:
    """Tokens issued before the switch carry a username, and must not be
    read as one, even a username made of digits that is not an id."""
    token = jwt.encode(
        {"sub": subject}, Config.JWT_SECRET_KEY, algorithm=Config.JWT_ALGORITHM
    )
    with pytest.raises(HTTPException) as exc_info:
        await is_user(token, session)
    assert exc_info.value.status_code == 401
