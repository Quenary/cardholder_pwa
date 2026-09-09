"""Account deletion, against a real database rather than mocks.

What matters here happens at the storage layer. Cards go in a bulk delete,
which does not run the ORM cascade, while the account itself goes through
session.delete, which does. Only the second one reaches the share rows, and
mocking the session would hide the difference.
"""

import pytest
import pytest_asyncio
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from backend.config import Config
from backend.core.user_core import delete_user
from backend.db.models import BaseModel, CardModel, CardShareModel, UserModel


@pytest.fixture
def logo_dir(tmp_path, monkeypatch):
    """Point the logo storage at a temporary directory.

    The deletion is then exercised for real rather than through a mock, so
    the test says something about the file on disk.
    """
    directory = tmp_path / "logos"
    directory.mkdir()
    monkeypatch.setattr(Config, "LOGO_DIR", str(directory))
    return directory


@pytest_asyncio.fixture
async def session(tmp_path):
    engine = create_async_engine(f"sqlite+aiosqlite:///{tmp_path / 'test.db'}")
    async with engine.begin() as conn:
        await conn.run_sync(BaseModel.metadata.create_all)
    maker = async_sessionmaker(bind=engine, expire_on_commit=False)
    async with maker() as db:
        yield db
    await engine.dispose()


async def _seed(db):
    """alice owns a card with a logo, and shares it with bob."""
    alice = UserModel(username="alice", email="alice@example.com", hashed_password="x")
    bob = UserModel(username="bob", email="bob@example.com", hashed_password="x")
    db.add_all([alice, bob])
    await db.commit()

    card = CardModel(
        code="0123456789012",
        code_type="ean13",
        name="Shop",
        user_id=alice.id,
        logo_file="alice-logo.webp",
    )
    db.add(card)
    await db.commit()

    db.add(
        CardShareModel(card_id=card.id, owner_id=alice.id, shared_with_user_id=bob.id)
    )
    await db.commit()
    return alice, bob, card


@pytest.mark.asyncio
async def test_the_logo_files_of_a_deleted_account_are_removed(
    session, logo_dir
) -> None:
    alice, _, _ = await _seed(session)
    stored = logo_dir / "alice-logo.webp"
    stored.write_bytes(b"not really an image, nothing reads it here")

    await delete_user(session, alice)

    assert not stored.exists()


@pytest.mark.asyncio
async def test_deleting_the_recipient_removes_the_share(session, logo_dir) -> None:
    _, bob, _ = await _seed(session)

    await delete_user(session, bob)

    assert await session.scalar(select(func.count()).select_from(CardShareModel)) == 0


@pytest.mark.asyncio
async def test_deleting_the_owner_removes_the_share(session, logo_dir) -> None:
    alice, _, _ = await _seed(session)

    await delete_user(session, alice)

    assert await session.scalar(select(func.count()).select_from(CardShareModel)) == 0


@pytest.mark.asyncio
async def test_the_next_account_inherits_nothing(session, logo_dir) -> None:
    """SQLite hands the freed row id to the next account.

    Nothing is left pointing at the deleted one, so the account that picks up
    the id starts empty. That holds because deleting a user is an ORM delete
    and the two share relationships cascade; it would not survive turning
    that into a bulk delete.
    """
    _, bob, _ = await _seed(session)
    bob_id = bob.id

    await delete_user(session, bob)

    mallory = UserModel(
        username="mallory", email="mallory@example.com", hashed_password="x"
    )
    session.add(mallory)
    await session.commit()
    assert mallory.id == bob_id, "expected the id to be reused"

    visible = await session.execute(
        select(CardModel.name)
        .join(CardShareModel, CardShareModel.card_id == CardModel.id)
        .where(CardShareModel.shared_with_user_id == mallory.id)
    )
    assert visible.scalars().all() == []
