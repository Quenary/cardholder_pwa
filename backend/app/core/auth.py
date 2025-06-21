from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from datetime import timedelta, datetime
from app.helpers import now
from passlib.context import CryptContext
from sqlalchemy.orm import Session
import app.schemas as schemas, app.db as db, app.db.models as models, app.enums as enums
from typing import cast
import secrets
from app.config import Config


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/token")
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain: str, hashed) -> bool:
    return pwd_context.verify(plain, hashed)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    expire = now() + (
        expires_delta or timedelta(minutes=Config.ACCESS_TOKEN_LIFETIME_MIN)
    )
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(
        to_encode, Config.JWT_SECRET_KEY, algorithm=Config.JWT_ALGORITHM
    )
    return encoded_jwt, expire


def create_refresh_token(
    user_id: int, db: Session, user_agent: str | None = None, ip: str | None = None
):
    token = secrets.token_urlsafe(32)
    expires_at = now() + timedelta(minutes=Config.REFRESH_TOKEN_LIFETIME_MIN)
    db_token = models.RefreshToken(
        token=token,
        user_id=user_id,
        expires_at=expires_at,
        user_agent=user_agent,
        ip_address=ip,
    )
    db.add(db_token)
    db.commit()
    db.refresh(db_token)
    return db_token


def revoke_refresh_token(db: Session, token: str):
    db_token = db.query(models.RefreshToken).filter_by(token=token).first()
    if db_token:
        db_token.revoked = True
        db.commit()


def authenticate_user(db: Session, username: str, password: str):
    user = db.query(models.User).filter_by(username=username).first()
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user


def build_token_response(
    access_token: str, access_exp: datetime, refresh_token: models.RefreshToken
):
    return schemas.TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=int((access_exp - now()).total_seconds()),
        refresh_token=refresh_token.token,
    )


def is_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(db.get_db)
) -> models.User:
    """
    Check if the request credentials is valid.
    Returns user.
    Raise 401 on fail
    """
    credentials_exception = HTTPException(status_code=401, detail="Invalid token")
    try:
        payload = jwt.decode(
            token, Config.JWT_SECRET_KEY, algorithms=[Config.JWT_ALGORITHM]
        )
        username: str = cast(str, payload.get("sub"))
        if not username:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = db.query(models.User).filter(models.User.username == username).first()
    if not user:
        raise credentials_exception
    return user


def is_user_admin(
    token: str = Depends(oauth2_scheme), db: Session = Depends(db.get_db)
) -> models.User:
    """
    Check if the request credentials is valid and match admin/owner.
    Returns user.
    Raise 403 on fail.
    """
    user = is_user(token, db)
    roles: list[enums.EUserRole] = [enums.EUserRole.OWNER, enums.EUserRole.ADMIN]
    if user.role_code in roles:
        return user
    raise HTTPException(403, "Not admin user")


def is_user_owner(
    token: str = Depends(oauth2_scheme), db: Session = Depends(db.get_db)
) -> models.User:
    """
    Check if the request credentials is valid and match owner.
    Returns user.
    Raise 403 on fail.
    """
    user = is_user(token, db)
    if user.role_code == enums.EUserRole.OWNER:
        return user
    raise HTTPException(403, "Not owner user")


def allow_registration(db: Session = Depends(db.get_db)) -> bool:
    """Check if user registration is allowed. Raise  403 on fail."""
    setting = (
        db.query(models.Setting)
        .filter_by(key=enums.ESettingKey.ALLOW_REGISTRATION)
        .first()
    )
    if not setting or setting.value.lower() != "true":
        raise HTTPException(403, "Registration now allowed")
    return True
