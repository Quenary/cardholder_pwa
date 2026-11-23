import secrets
from datetime import datetime, timedelta
from typing import cast

import bcrypt
import jwt
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jwt import PyJWTError as JWTError
from sqlalchemy import func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from backend.config import Config
from backend.core.hash_core import hash_token
from backend.db.models.refresh_token_model import RefreshTokenModel
from backend.db.models.settings_model import SettingModel
from backend.db.models.user_model import UserModel
from backend.db.session import get_async_session
from backend.enums.settings_enum import ESettingKey
from backend.enums.user_role_enum import EUserRole
from backend.helpers.now import now
from backend.schemas.auth_schema import TokenResponseSchema

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/token")

# bcrypt only ever looks at the first 72 bytes of a password. Up to 4.x the
# library cut longer input silently; from 5.0 it raises ValueError instead.
BCRYPT_MAX_PASSWORD_BYTES = 72


def verify_password(plain: str, hashed: str) -> bool:
    # Cut to what bcrypt considers, rather than letting 5.x raise: a login
    # with a long password would otherwise be a 500, and an account whose
    # long password was hashed by an older bcrypt (which truncated it) could
    # no longer log in at all. The hash was built from these same 72 bytes.
    plain_bytes = plain.encode("utf-8")[:BCRYPT_MAX_PASSWORD_BYTES]
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
    # typ distinguishes an access token from a two-factor challenge. A token
    # issued before this claim existed fails here and is replaced by a refresh
    # within ACCESS_TOKEN_LIFETIME_MIN.
    to_encode.update({"exp": expire, "typ": "access"})
    encoded_jwt = jwt.encode(
        to_encode,
        Config.JWT_SECRET_KEY,
        algorithm=Config.JWT_ALGORITHM,
    )
    return encoded_jwt, expire


def create_challenge_token(user_id: int) -> tuple[str, datetime]:
    """Short-lived JWT that only /token/2fa accepts. Not single-use."""
    expire = now() + timedelta(minutes=Config.TWO_FACTOR_CHALLENGE_LIFETIME_MIN)
    token = jwt.encode(
        {"sub": str(user_id), "typ": "2fa_challenge", "exp": expire},
        Config.JWT_SECRET_KEY,
        algorithm=Config.JWT_ALGORITHM,
    )
    return token, expire


def decode_token(token: str, expected_typ: str) -> dict:
    """Decode a JWT and require its typ claim. The only jwt.decode in the app."""
    payload = jwt.decode(
        token,
        Config.JWT_SECRET_KEY,
        algorithms=[Config.JWT_ALGORITHM],
    )
    if payload.get("typ") != expected_typ:
        raise JWTError("Unexpected token type")
    return payload


def hash_refresh_token(token: str) -> str:
    return hash_token(token)


async def lock_user_row(session: AsyncSession, user_id: int) -> None:
    """Lock this user until the current transaction commits.

    Issuing a refresh token and revoking them both take the lock, and the
    new token is inserted before that transaction commits. Otherwise a
    revoke can commit, and a login or refresh that already passed its check
    inserts a token the revoke did not see. SQLite ignores FOR UPDATE, so
    the lock is the update itself. Autoflush stays off: a stale in-memory
    flag must not be written back over the row this lock just waited for.
    """
    with session.no_autoflush:
        await session.execute(
            update(UserModel)
            .where(UserModel.id == user_id)
            .values(two_factor_failed_attempts=UserModel.two_factor_failed_attempts)
        )


async def read_user_for_session(session: AsyncSession, user_id: int) -> UserModel:
    """Lock the user and return the row as the database has it now."""
    with session.no_autoflush:
        await lock_user_row(session, user_id)
        result = await session.execute(
            select(UserModel)
            .where(UserModel.id == user_id)
            .limit(1)
            .execution_options(populate_existing=True)
        )
    return result.scalar_one()


async def create_refresh_token(
    user_id: int,
    session: AsyncSession,
    user_agent: str | None = None,
    ip: str | None = None,
) -> str:
    """Stores a new refresh token (hashed) and returns it, in the clear."""
    token = secrets.token_urlsafe(32)
    expires_at = now() + timedelta(minutes=Config.REFRESH_TOKEN_LIFETIME_MIN)
    db_token = RefreshTokenModel(
        token=hash_refresh_token(token),
        user_id=user_id,
        expires_at=expires_at,
        user_agent=user_agent,
        ip_address=ip,
    )
    session.add(db_token)
    await session.commit()
    return token


async def authenticate_user(session: AsyncSession, username: str, password: str):
    stmt = select(UserModel).where(UserModel.username == username).limit(1)
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user


def build_token_response(
    access_token: str,
    access_exp: datetime,
    refresh_token: str,
):
    return TokenResponseSchema(
        access_token=access_token,
        token_type="bearer",
        expires_in=int((access_exp - now()).total_seconds()),
        refresh_token=refresh_token,
    )


async def is_user(
    token: str = Depends(oauth2_scheme),
    session: AsyncSession = Depends(get_async_session),
) -> UserModel:
    """
    Check if the request credentials is valid.
    Returns user.
    Raise 401 on fail
    """
    credentials_exception = HTTPException(status_code=401, detail="Invalid token")
    try:
        payload = decode_token(token, "access")
        subject = cast(str | None, payload.get("sub"))
        # The subject is the user id: a username can be renamed, and a new
        # account taking the old name would otherwise accept the previous
        # owner's tokens until they expire. Tokens issued before that, with
        # a username here, are refused and get replaced by a refresh.
        if not subject or not subject.isascii() or not subject.isdigit():
            raise credentials_exception
        user_id = int(subject)
    except JWTError:
        raise credentials_exception from None
    stmt = select(UserModel).where(UserModel.id == user_id).limit(1)
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()
    if not user:
        raise credentials_exception
    return user


async def is_user_admin(
    token: str = Depends(oauth2_scheme),
    session: AsyncSession = Depends(get_async_session),
) -> UserModel:
    """
    Check if the request credentials is valid and match admin/owner.
    Returns user.
    Raise 403 on fail.
    """
    user = await is_user(token, session)
    roles: list[EUserRole] = [EUserRole.OWNER, EUserRole.ADMIN]
    if user.role_code in roles:
        return user
    raise HTTPException(403, "Not admin user")


async def is_user_owner(
    token: str = Depends(oauth2_scheme),
    session: AsyncSession = Depends(get_async_session),
) -> UserModel:
    """
    Check if the request credentials is valid and match owner.
    Returns user.
    Raise 403 on fail.
    """
    user = await is_user(token, session)
    if user.role_code == EUserRole.OWNER:
        return user
    raise HTTPException(403, "Not owner user")


async def allow_registration(
    session: AsyncSession = Depends(get_async_session),
):
    """Check if user registration is allowed. Raise  403 on fail."""
    stmt = (
        select(SettingModel)
        .where(SettingModel.key == ESettingKey.ALLOW_REGISTRATION)
        .limit(1)
    )
    result = await session.execute(stmt)
    setting = result.scalar_one_or_none()
    if not setting or setting.value.lower() != "true":
        raise HTTPException(403, "registration feature disabled in app settings")
    return True


async def is_creds_taken(
    session: AsyncSession,
    username: str,
    email: str,
    user_id: int | None,
):
    """
    Check if user credentials already taken by
    another user. The comparison ignores case, so "Alice" and "alice" are
    the same name, and so are "A@x.org" and "a@x.org".
    """
    stmt = (
        select(UserModel)
        .where(
            or_(
                func.lower(UserModel.username) == username.lower(),
                func.lower(UserModel.email) == email.lower(),
            ),
            UserModel.id != user_id,
        )
        .limit(1)
    )
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()
    return user is not None
