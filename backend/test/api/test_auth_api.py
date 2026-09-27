"""Session endpoints, against a real database rather than mocks."""

from datetime import timedelta

import pytest
import pytest_asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from backend.api.auth_api import logout
from backend.db.models import BaseModel, RefreshTokenModel, UserModel
from backend.helpers.now import now
from backend.schemas.auth_schema import RevokeRequestSchema


@pytest_asyncio.fixture
async def session(tmp_path):
    engine = create_async_engine(f"sqlite+aiosqlite:///{tmp_path / 'test.db'}")
    async with engine.begin() as conn:
        await conn.run_sync(BaseModel.metadata.create_all)
    maker = async_sessionmaker(bind=engine, expire_on_commit=False)
    async with maker() as db:
        yield db
    await engine.dispose()


async def _seed(db) -> tuple[UserModel, UserModel]:
    alice = UserModel(username="alice", email="alice@example.com", hashed_password="x")
    bob = UserModel(username="bob", email="bob@example.com", hashed_password="x")
    db.add_all([alice, bob])
    await db.commit()
    expires_at = now() + timedelta(days=1)
    db.add_all(
        [
            RefreshTokenModel(
                token="alice-rt", user_id=alice.id, expires_at=expires_at
            ),
            RefreshTokenModel(token="bob-rt", user_id=bob.id, expires_at=expires_at),
        ]
    )
    await db.commit()
    return alice, bob


async def _revoked(db, token: str) -> bool:
    result = await db.execute(
        select(RefreshTokenModel.revoked).where(RefreshTokenModel.token == token)
    )
    return result.scalar_one()


@pytest.mark.asyncio
async def test_logout_revokes_the_callers_refresh_token(session) -> None:
    alice, _ = await _seed(session)

    await logout(
        RevokeRequestSchema(refresh_token="alice-rt"),
        session=session,
        current_user=alice,
    )

    assert await _revoked(session, "alice-rt") is True


@pytest.mark.asyncio
async def test_logout_leaves_someone_elses_refresh_token_alone(session) -> None:
    alice, _ = await _seed(session)

    await logout(
        RevokeRequestSchema(refresh_token="bob-rt"),
        session=session,
        current_user=alice,
    )

    assert await _revoked(session, "bob-rt") is False
