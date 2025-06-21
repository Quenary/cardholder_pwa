from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import update
import app.db.models as models, app.db as db, app.schemas as schemas, app.core.auth as auth
import secrets
from datetime import timedelta
from app.helpers import now
from app.core.smtp import EmailSender
from app.config import Config
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload

router = APIRouter(tags=["password recovery"], prefix="/recovery")


@router.post("/code", description="Request password recovery code")
async def code(
    request: Request,
    body: schemas.PasswordRecoveryCodeBody,
    session: AsyncSession = Depends(db.get_async_session),
):
    stmt = select(models.User).where(models.User.email == body.email).limit(1)
    result = await session.execute(stmt)

    user = result.scalar_one_or_none()
    if user:
        recent_code_stmt = (
            select(models.PasswordRecoveryCode)
            .where(models.PasswordRecoveryCode.user_id == user.id)
            .order_by(desc(models.PasswordRecoveryCode.created_at))
            .limit(1)
        )
        code_result = await session.execute(recent_code_stmt)
        last_code = code_result.scalar_one_or_none()
        if last_code and last_code.created_at > now() - timedelta(minutes=1):
            raise HTTPException(429, "You can request a new code only once per minute.")

        code = secrets.token_urlsafe(8)
        expires_at = now() + timedelta(
            minutes=Config.PASSWORD_RECOVERY_CODE_LIFETIME_MIN
        )

        try:
            reset_url = None
            host = request.headers.get("host", "")
            scheme = request.scope["scheme"]
            if host and scheme:
                reset_url = f"{scheme}://{host}/password-recovery/submit?code={code}"
            EmailSender.send_password_reset_email(body.email, code, reset_url)
        except Exception as e:
            raise HTTPException(500, "Unable to send email. Try again later.")

        db_code = models.PasswordRecoveryCode(
            code=code, expires_at=expires_at, user_id=user.id
        )
        session.add(db_code)
        await session.commit()
        await session.refresh(db_code)
    return {}


@router.put("/submit", description="Submit password recovery with secret code")
async def password(
    body: schemas.PasswordRecoverySubmitBody,
    session: AsyncSession = Depends(db.get_async_session),
):
    stmt = (
        select(models.PasswordRecoveryCode)
        .where(
            models.PasswordRecoveryCode.code == body.code,
            models.PasswordRecoveryCode.revoked == False,
            models.PasswordRecoveryCode.expires_at > now(),
        )
        .options(selectinload(models.PasswordRecoveryCode.user))
        .limit(1)
    )
    result = await session.execute(stmt)
    db_code = result.scalar_one_or_none()
    if not db_code:
        raise HTTPException(status_code=401, detail="Invalid or expired code")

    user = db_code.user
    user.hashed_password = auth.get_password_hash(body.password)
    await session.commit()
    await session.refresh(user)

    await session.execute(
        update(models.PasswordRecoveryCode)
        .where(models.PasswordRecoveryCode.user_id == user.id)
        .values(revoked=True)
    )
    await session.commit()

    await session.execute(
        update(models.RefreshToken)
        .where(models.RefreshToken.user_id == user.id)
        .values(revoked=True)
    )
    await session.commit()

    return {}
