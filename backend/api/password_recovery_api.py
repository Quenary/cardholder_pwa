from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import update
from backend.schemas.password_recovery_schema import (
    PasswordRecoveryCodeRequestSchema,
    PasswordRecoverySubmitSchema,
)
from backend.db.session import get_async_session
from backend.db.models.user_model import UserModel
from backend.db.models.password_recovery_code_model import (
    PasswordRecoveryCodeModel,
)
from backend.db.models.refresh_token_model import RefreshTokenModel
from backend.core.auth_core import get_password_hash
import secrets
from datetime import timedelta
from backend.helpers.now import now
from backend.core.smtp_core import EmailSender
from backend.config import Config
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload
import asyncio
from backend.helpers.delay_to_minimum import delay_to_minimum

router = APIRouter(tags=["password recovery"], prefix="/recovery")


@router.post("/code", description="Request password recovery code")
@delay_to_minimum(1)
async def code(
    request: Request,
    body: PasswordRecoveryCodeRequestSchema,
    session: AsyncSession = Depends(get_async_session),
):
    stmt = (
        select(UserModel)
        .where(UserModel.email == body.email)
        .limit(1)
    )
    result = await session.execute(stmt)

    user = result.scalar_one_or_none()
    if user:
        recent_code_stmt = (
            select(PasswordRecoveryCodeModel)
            .where(
                PasswordRecoveryCodeModel.user_id == user.id,
                PasswordRecoveryCodeModel.created_at
                > now() - timedelta(minutes=1),
            )
            .order_by(desc(PasswordRecoveryCodeModel.created_at))
            .limit(1)
        )
        code_result = await session.execute(recent_code_stmt)
        last_code = code_result.scalar_one_or_none()
        if last_code:
            return {}

        code = secrets.token_urlsafe(8)
        expires_at = now() + timedelta(
            minutes=Config.PASSWORD_RECOVERY_CODE_LIFETIME_MIN
        )

        reset_url = None
        host = request.headers.get("host", "")
        scheme = request.scope["scheme"]
        if host and scheme:
            reset_url = f"{scheme}://{host}/password-recovery/submit?code={code}"
        asyncio.create_task(
            asyncio.to_thread(
                EmailSender.send_password_reset_email,
                body.email,
                code,
                reset_url,
            )
        )

        db_code = PasswordRecoveryCodeModel(
            code=code, expires_at=expires_at, user_id=user.id
        )
        session.add(db_code)
        await session.commit()
        await session.refresh(db_code)
    return {}


@router.put(
    "/submit", description="Submit password recovery with secret code"
)
async def password(
    body: PasswordRecoverySubmitSchema,
    session: AsyncSession = Depends(get_async_session),
):
    stmt = (
        select(PasswordRecoveryCodeModel)
        .where(
            PasswordRecoveryCodeModel.code == body.code,
            PasswordRecoveryCodeModel.revoked == False,
            PasswordRecoveryCodeModel.expires_at > now(),
        )
        .options(selectinload(PasswordRecoveryCodeModel.user))
        .limit(1)
    )
    result = await session.execute(stmt)
    db_code = result.scalar_one_or_none()
    if not db_code:
        raise HTTPException(
            status_code=401, detail="Invalid or expired code"
        )

    user = db_code.user
    user.hashed_password = get_password_hash(body.password)
    await session.commit()
    await session.refresh(user)

    await session.execute(
        update(PasswordRecoveryCodeModel)
        .where(PasswordRecoveryCodeModel.user_id == user.id)
        .values(revoked=True)
    )
    await session.commit()

    await session.execute(
        update(RefreshTokenModel)
        .where(RefreshTokenModel.user_id == user.id)
        .values(revoked=True)
    )
    await session.commit()

    return {}
