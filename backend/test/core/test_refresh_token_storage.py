"""Refresh tokens are stored as a sha256: a copy of the database opens no db."""

from datetime import timedelta

import pytest
from fastapi import HTTPException, Request
from sqlalchemy import select

from backend.api.auth_api import refresh_token
from backend.core.auth_core import create_refresh_token, hash_refresh_token
from backend.db.models import RefreshTokenModel, UserModel
from backend.helpers.now import now
from backend.schemas.auth_schema import RefreshRequestSchema

REQUEST = Request({"type": "http", "headers": [], "client": None})


async def _user(db) -> UserModel:
    user = UserModel(username="erin", email="erin@example.com", hashed_password="x")
    db.add(user)
    await db.commit()
    return user


async def _refresh(db, token: str):
    return await refresh_token(REQUEST, RefreshRequestSchema(refresh_token=token), db)


@pytest.mark.asyncio
async def test_the_database_holds_the_hash_and_the_client_the_token(db) -> None:
    user = await _user(db)
    token = await create_refresh_token(user.id, db)

    stored = (await db.execute(select(RefreshTokenModel.token))).scalar_one()
    assert stored == hash_refresh_token(token)
    assert stored != token
    assert (await _refresh(db, token)).refresh_token != token  # rotated


@pytest.mark.asyncio
async def test_the_stored_hash_is_not_a_usable_token(db) -> None:
    user = await _user(db)
    token = await create_refresh_token(user.id, db)

    with pytest.raises(HTTPException) as e:
        await _refresh(db, hash_refresh_token(token))
    assert e.value.status_code == 401


@pytest.mark.asyncio
async def test_a_token_stored_in_the_clear_before_the_upgrade_is_refused(db) -> None:
    """Sessions from before the upgrade end: their owners sign in again."""
    user = await _user(db)
    db.add(
        RefreshTokenModel(
            token="legacy-raw-token",
            user_id=user.id,
            expires_at=now() + timedelta(days=1),
        )
    )
    await db.commit()

    with pytest.raises(HTTPException) as e:
        await _refresh(db, "legacy-raw-token")
    assert e.value.status_code == 401
