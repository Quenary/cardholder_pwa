"""Importable helpers for backend tests.

Pytest discovers fixtures from ``conftest.py``. Factories that tests call
directly live here so modules do not import ``conftest``.
"""

from collections.abc import AsyncIterator, Sequence
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any
from unittest.mock import AsyncMock, MagicMock

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from backend.db.models import BaseModel


def mock_session(
    *,
    scalar_one_or_none: Any = None,
    all_: Sequence[Any] | None = None,
    scalar: Any = None,
    results: Sequence[Any] | None = None,
) -> AsyncMock:
    """AsyncSession whose ``execute`` returns one result, or ``results`` in order."""
    session = AsyncMock(spec=AsyncSession)
    if results is not None:
        session.execute.side_effect = list(results)
    else:
        result = MagicMock()
        result.scalar_one_or_none.return_value = scalar_one_or_none
        result.scalars.return_value.all.return_value = list(all_ or [])
        session.execute.return_value = result
    session.scalar.return_value = scalar
    return session


@asynccontextmanager
async def sqlite_db(
    path: Path | str = ":memory:",
) -> AsyncIterator[async_sessionmaker[AsyncSession]]:
    """SQLite engine with the metadata applied. Disposes the engine on exit."""
    url = (
        "sqlite+aiosqlite:///:memory:"
        if path == ":memory:"
        else f"sqlite+aiosqlite:///{path}"
    )
    engine = create_async_engine(url)
    async with engine.begin() as conn:
        await conn.run_sync(BaseModel.metadata.create_all)
    maker = async_sessionmaker(bind=engine, expire_on_commit=False)
    try:
        yield maker
    finally:
        await engine.dispose()
