from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from datetime import timedelta, datetime
from app.helpers import now
import bcrypt
import app.schemas as schemas, app.db as db, app.db.models as models, app.enums as enums
from typing import cast
import secrets
from app.config import Config
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/token")


def verify_password(plain: str, hashed: str) -> bool:
    plain_bytes = plain.encode("utf-8")
    hashed_bytes = hashed.encode("utf-8")
    return bcrypt.checkpw(plain_bytes, hashed_bytes)


def get_password_hash(password: str) -> str:
    pwd_bytes = password.encode("utf-8")
    salt = bcrypt.gensalt()
    hashed_password = bcrypt.hashpw(password=pwd_bytes, salt=salt)
    return hashed_password.decode("utf-8")


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


async def create_refresh_token(
    user_id: int,
    session: AsyncSession,
    user_agent: str | None = None,
    ip: str | None = None,
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
    session.add(db_token)
    await session.commit()
    await session.refresh(db_token)
    return db_token


async def authenticate_user(session: AsyncSession, username: str, password: str):
    stmt = select(models.User).where(models.User.username == username).limit(1)
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()
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


async def is_user(
    token: str = Depends(oauth2_scheme),
    session: AsyncSession = Depends(db.get_async_session),
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
    stmt = select(models.User).where(models.User.username == username).limit(1)
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()
    if not user:
        raise credentials_exception
    return user


async def is_user_admin(
    token: str = Depends(oauth2_scheme),
    session: AsyncSession = Depends(db.get_async_session),
) -> models.User:
    """
    Check if the request credentials is valid and match admin/owner.
    Returns user.
    Raise 403 on fail.
    """
    user = await is_user(token, session)
    roles: list[enums.EUserRole] = [enums.EUserRole.OWNER, enums.EUserRole.ADMIN]
    if user.role_code in roles:
        return user
    raise HTTPException(403, "Not admin user")


async def is_user_owner(
    token: str = Depends(oauth2_scheme),
    session: AsyncSession = Depends(db.get_async_session),
) -> models.User:
    """
    Check if the request credentials is valid and match owner.
    Returns user.
    Raise 403 on fail.
    """
    user = await is_user(token, session)
    if user.role_code == enums.EUserRole.OWNER:
        return user
    raise HTTPException(403, "Not owner user")


async def allow_registration(session: AsyncSession = Depends(db.get_async_session)):
    """Check if user registration is allowed. Raise  403 on fail."""
    stmt = (
        select(models.Setting)
        .where(models.Setting.key == enums.ESettingKey.ALLOW_REGISTRATION)
        .limit(1)
    )
    result = await session.execute(stmt)
    setting = result.scalar_one_or_none()
    if not setting or setting.value.lower() != "true":
        raise HTTPException(403, "registration feature disabled in app settings")
    return True


async def is_creds_taken(
    session: AsyncSession, username: str, email: str, user_id: int | None
):
    """
    Check if user credentials already taken by
    another user.
    """
    stmt = (
        select(models.User)
        .where(
            or_(models.User.username == username, models.User.email == email),
            models.User.id != user_id,
        )
        .limit(1)
    )
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()
    return user is not None
