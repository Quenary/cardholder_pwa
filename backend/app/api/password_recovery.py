from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import update
import app.db.models as models, app.db as db, app.schemas as schemas, app.core.auth as auth
import secrets
from datetime import timedelta
from app.helpers import now
from app.core.smtp import EmailSender
from app.config import Config

router = APIRouter(tags=["password recovery"], prefix="/recovery")


@router.post("/code", description="Request password recovery code")
def code(
    request: Request,
    body: schemas.PasswordRecoveryCodeBody,
    db: Session = Depends(db.get_db),
):
    user = db.query(models.User).filter_by(email=body.email).first()
    if user:
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
            raise HTTPException(500, f"Unable to send email. Try again later.")

        db_code = models.PasswordRecoveryCode(
            code=code, expires_at=expires_at, user_id=user.id
        )
        db.add(db_code)
        db.commit()
        db.refresh(db_code)
    return {}


@router.put("/submit", description="Submit password recovery with secret code")
def password(
    body: schemas.PasswordRecoverySubmitBody,
    db: Session = Depends(db.get_db),
):
    db_code = (
        db.query(models.PasswordRecoveryCode)
        .filter_by(code=body.code, revoked=False)
        .first()
    )
    if not db_code or db_code.expires_at < now():
        raise HTTPException(status_code=401, detail="Invalid or expired code")

    db_code.revoked = True
    db.commit()

    user = db_code.user
    user.hashed_password = auth.get_password_hash(body.password)
    db.commit()

    db.execute(
        update(models.RefreshToken)
        .where(models.RefreshToken.user_id == user.id)
        .values(revoked=True)
    )
    db.commit()

    return {}
