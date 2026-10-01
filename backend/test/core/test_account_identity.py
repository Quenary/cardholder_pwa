"""Tests for the uniqueness of usernames and emails."""

from collections.abc import AsyncIterator

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from backend.core.auth_core import is_creds_taken
from backend.db.models.base_model import BaseModel
from backend.db.models.user_model import UserModel
from backend.db.models.user_role_model import UserRoleModel
from backend.enums.user_role_enum import EUserRole


@pytest_asyncio.fixture
async def session() -> AsyncIterator[AsyncSession]:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(BaseModel.metadata.create_all)
    async with async_sessionmaker(engine, expire_on_commit=False)() as s:
        for role in EUserRole:
            s.add(UserRoleModel(code=role))
        s.add(
            UserModel(
                id=1, username="Alice", email="Alice@Example.com", hashed_password="x"
            )
        )
        await s.commit()
        yield s
    await engine.dispose()


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
