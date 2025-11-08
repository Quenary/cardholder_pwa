import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import delete
from .models import RefreshToken, PasswordRecoveryCode
from .session import _async_session_maker
import logging
from backend.config import Config
from backend.helpers import now


async def cleanup():
    """
    Clean up old stuff e.g. expired refresh tokens,
    and schedules this process with infinite loop and sleep.
    """
    while True:
        async with _async_session_maker() as session:
            logging.info('Cardholder-pwa cleanup db')
            await _cleanup(session)
        await asyncio.sleep(Config.DB_CLEANUP_INTERVAL_MIN * 60)


async def _cleanup(session: AsyncSession):
    _now = now()

    await session.execute(
        delete(RefreshToken).where(
            (RefreshToken.expires_at < _now) | (RefreshToken.revoked == True)
        )
    )
    await session.execute(
        delete(PasswordRecoveryCode).where(
            (PasswordRecoveryCode.expires_at < _now)
            | (PasswordRecoveryCode.revoked == True)
        )
    )

    await session.commit()
