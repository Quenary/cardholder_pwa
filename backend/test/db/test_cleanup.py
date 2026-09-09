import asyncio
from unittest.mock import patch

import pytest

from backend.db.cleanup import cleanup


@pytest.mark.asyncio
async def test_cleanup_keeps_running_after_a_failed_round() -> None:
    """A failing round must not take the task down with it.

    The loop is started once at application startup and never restarted, so
    an exception escaping it would stop the cleanup for the life of the
    process.
    """
    rounds = []

    async def fake_cleanup(_session) -> None:
        rounds.append(1)
        if len(rounds) == 1:
            raise RuntimeError("database is locked")

    async def fake_sleep(_seconds) -> None:
        if len(rounds) >= 2:
            raise asyncio.CancelledError

    with (
        patch("backend.db.cleanup._cleanup", new=fake_cleanup),
        patch("backend.db.cleanup.asyncio.sleep", new=fake_sleep),
        pytest.raises(asyncio.CancelledError),
    ):
        await cleanup()

    assert len(rounds) == 2
