import asyncio
import logging

from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from backend.config import Config
from backend.helpers.now import now

from .models.password_recovery_code_model import PasswordRecoveryCodeModel
from .models.refresh_token_model import RefreshTokenModel
from .session import _async_session_maker


async def cleanup():
    """
    Clean up old stuff e.g. expired refresh tokens,
    and schedules this process with infinite loop and sleep.
    """
    while True:
        async with _async_session_maker() as session:
            logging.info("Cardholder-pwa cleanup db")
            await _cleanup(session)
        await asyncio.sleep(Config.DB_CLEANUP_INTERVAL_MIN * 60)


async def _cleanup(session: AsyncSession):
    _now = now()

    await session.execute(
        delete(RefreshTokenModel).where(
            (RefreshTokenModel.expires_at < _now)
            | (RefreshTokenModel.revoked.is_(True))
        )
    )
    await session.execute(
        delete(PasswordRecoveryCodeModel).where(
            (PasswordRecoveryCodeModel.expires_at < _now)
            | (PasswordRecoveryCodeModel.revoked.is_(True))
        )
    )

    await session.commit()
