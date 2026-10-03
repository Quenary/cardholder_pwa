import pytest
import pytest_asyncio

from backend.app import app
from backend.testing import sqlite_db


@pytest.fixture(autouse=True)
def restore_dependency_overrides():
    """Drop per-test FastAPI overrides so they do not leak into the next test."""
    snapshot = dict(app.dependency_overrides)
    yield
    app.dependency_overrides.clear()
    app.dependency_overrides.update(snapshot)


@pytest_asyncio.fixture
async def db(tmp_path):
    async with sqlite_db(tmp_path / "test.db") as maker:
        async with maker() as session:
            yield session
