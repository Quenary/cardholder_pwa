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


def _request():
    from starlette.requests import Request

    return Request({"type": "http", "headers": [], "client": ("127.0.0.1", 1)})


@pytest.mark.asyncio
async def test_refresh_rotates_the_token(session) -> None:
    from backend.api.auth_api import refresh_token
    from backend.schemas.auth_schema import RefreshRequestSchema

    await _seed(session)

    fresh = await refresh_token(
        _request(), RefreshRequestSchema(refresh_token="alice-rt"), session
    )

    assert await _revoked(session, "alice-rt") is True
    assert fresh.refresh_token != "alice-rt"


@pytest.mark.asyncio
async def test_two_refreshes_with_the_same_token_do_not_both_succeed(
    tmp_path,
) -> None:
    """Rotation was a select followed by an update, so two requests carrying
    the same token could both pass the select before either revoked it."""
    import asyncio

    from fastapi import HTTPException

    from backend.api.auth_api import refresh_token
    from backend.schemas.auth_schema import RefreshRequestSchema

    engine = create_async_engine(f"sqlite+aiosqlite:///{tmp_path / 'race.db'}")
    async with engine.begin() as conn:
        await conn.run_sync(BaseModel.metadata.create_all)
    maker = async_sessionmaker(bind=engine, expire_on_commit=False)
    async with maker() as seed:
        await _seed(seed)

    barrier = asyncio.Barrier(2)

    async def attempt():
        async with maker() as db:
            original = db.execute

            async def execute(*args, **kwargs):
                result = await original(*args, **kwargs)
                if not getattr(db, "_met", False):
                    # Both callers have read the token before either updates.
                    db._met = True
                    await barrier.wait()
                return result

            db.execute = execute  # type: ignore[method-assign]
            return await refresh_token(
                _request(), RefreshRequestSchema(refresh_token="alice-rt"), db
            )

    results = await asyncio.gather(attempt(), attempt(), return_exceptions=True)
    await engine.dispose()

    failures = [r for r in results if isinstance(r, HTTPException)]
    assert len(failures) == 1
    assert failures[0].status_code == 401
