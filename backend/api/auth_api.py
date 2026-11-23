from typing import cast

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from jwt import PyJWTError as JWTError
from sqlalchemy import CursorResult, select, update
from sqlalchemy.exc import NoResultFound
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.core.auth_core import (
    authenticate_user,
    build_token_response,
    create_access_token,
    create_challenge_token,
    create_refresh_token,
    decode_token,
    hash_refresh_token,
    is_user,
    lock_user_row,
    read_user_for_session,
)
from backend.core.two_factor_core import (
    clear_failures,
    lock_second_factor_user,
    record_failure,
    verify_second_factor,
)
from backend.db.models.refresh_token_model import RefreshTokenModel
from backend.db.models.user_model import UserModel
from backend.db.session import get_async_session
from backend.helpers.delay_to_minimum import delay_to_minimum
from backend.helpers.now import now
from backend.schemas.auth_schema import (
    RefreshRequestSchema,
    RevokeRequestSchema,
    TokenResponseSchema,
)
from backend.schemas.two_factor_schema import (
    TwoFactorChallengeSchema,
    TwoFactorVerifySchema,
)

router = APIRouter(tags=["auth"])

_CHALLENGE_INVALID = "Invalid or expired two-factor challenge"
_CODE_INVALID = "Invalid two-factor code"


async def issue_token_pair(
    request: Request,
    session: AsyncSession,
    user: UserModel,
) -> TokenResponseSchema:
    access_token, access_exp = create_access_token({"sub": str(user.id)})
    refresh_token = await create_refresh_token(
        user.id,
        session,
        request.headers.get("user-agent"),
        request.client.host if request.client else None,
    )
    return build_token_response(access_token, access_exp, refresh_token)


@router.post(
    "/token",
    response_model=TokenResponseSchema | TwoFactorChallengeSchema,
)
@delay_to_minimum(1)
async def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    session: AsyncSession = Depends(get_async_session),
):
    user = await authenticate_user(session, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    # Re-read under the session lock. The row above was loaded before the
    # password check, and enabling 2FA in that window must not still receive
    # a refresh token from this request.
    user_id = user.id
    user = await read_user_for_session(session, user_id)
    if user.two_factor_enabled_at is not None:
        await session.rollback()
        challenge, expires = create_challenge_token(user_id)
        return TwoFactorChallengeSchema(
            challenge_token=challenge,
            expires_in=int((expires - now()).total_seconds()),
        )
    return await issue_token_pair(request, session, user)


@router.post("/token/2fa", response_model=TokenResponseSchema)
@delay_to_minimum(1)
async def login_two_factor(
    request: Request,
    body: TwoFactorVerifySchema,
    session: AsyncSession = Depends(get_async_session),
):
    invalid = HTTPException(status_code=401, detail=_CHALLENGE_INVALID)
    try:
        payload = decode_token(body.challenge_token, "2fa_challenge")
        subject = cast(str | None, payload.get("sub"))
        if not subject or not subject.isascii() or not subject.isdigit():
            raise invalid
        user_id = int(subject)
    except JWTError:
        raise invalid from None
    try:
        user = await lock_second_factor_user(session, user_id)
    except NoResultFound:
        await session.rollback()
        raise invalid from None
    if user.two_factor_enabled_at is None:
        await session.rollback()
        raise invalid
    # The lock stays until this attempt commits. A 503 rolls it back here.
    # A wrong code is committed by record_failure, which releases the lock
    # before the response delay.
    try:
        accepted = await verify_second_factor(session, user, body.code)
    except HTTPException:
        await session.rollback()
        raise
    if not accepted:
        await record_failure(session, user)
        raise HTTPException(status_code=401, detail=_CODE_INVALID)
    await clear_failures(session, user.id)
    return await issue_token_pair(request, session, user)


@router.post("/token/refresh", response_model=TokenResponseSchema)
async def refresh_token(
    request: Request,
    form: RefreshRequestSchema,
    session: AsyncSession = Depends(get_async_session),
):
    stmt = (
        select(RefreshTokenModel)
        .where(
            RefreshTokenModel.token == hash_refresh_token(form.refresh_token),
            RefreshTokenModel.revoked.is_(False),
            RefreshTokenModel.expires_at > now(),
        )
        .options(selectinload(RefreshTokenModel.user))
        .limit(1)
    )
    result = await session.execute(stmt)
    db_token = result.scalar_one_or_none()
    if not db_token:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    # The claim and the new token commit together, while the user row is
    # locked. A revoke that is waiting on that lock then covers the new token,
    # and a revoke that already committed makes this claim match nothing.
    await lock_user_row(session, db_token.user_id)
    claim = await session.execute(
        update(RefreshTokenModel)
        .where(
            RefreshTokenModel.id == db_token.id,
            RefreshTokenModel.revoked.is_(False),
        )
        .values(revoked=True)
    )
    if cast(CursorResult, claim).rowcount != 1:
        await session.rollback()
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    user = db_token.user
    access_token, access_exp = create_access_token({"sub": str(user.id)})
    new_refresh = await create_refresh_token(
        user.id,
        session,
        request.headers.get("user-agent"),
        request.client.host if request.client else None,
    )
    return build_token_response(access_token, access_exp, new_refresh)


@router.post("/logout")
async def logout(
    form: RevokeRequestSchema,
    session: AsyncSession = Depends(get_async_session),
    current_user: UserModel = Depends(is_user),
):
    # Scoped to the caller: logging out must not be a way to end somebody
    # else's session with a refresh token that is not one's own.
    stmt = (
        select(RefreshTokenModel)
        .where(
            RefreshTokenModel.token == hash_refresh_token(form.refresh_token),
            RefreshTokenModel.user_id == current_user.id,
            RefreshTokenModel.revoked.is_(False),
        )
        .limit(1)
    )
    result = await session.execute(stmt)
    db_token = result.scalar_one_or_none()
    if db_token:
        db_token.revoked = True
        await session.commit()
    return {"detail": "Logged out successfully."}
