from typing import cast

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import CursorResult, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.core.auth_core import (
    authenticate_user,
    build_token_response,
    create_access_token,
    create_refresh_token,
    is_user,
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

router = APIRouter(tags=["auth"])


@router.post("/token", response_model=TokenResponseSchema)
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
    access_token, access_exp = create_access_token({"sub": str(user.id)})
    refresh_token = await create_refresh_token(
        user.id,
        session,
        request.headers.get("user-agent"),
        request.client.host if request.client else None,
    )
    return build_token_response(access_token, access_exp, refresh_token)


@router.post("/token/refresh", response_model=TokenResponseSchema)
async def refresh_token(
    request: Request,
    form: RefreshRequestSchema,
    session: AsyncSession = Depends(get_async_session),
):
    stmt = (
        select(RefreshTokenModel)
        .where(
            RefreshTokenModel.token == form.refresh_token,
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

    # Claim the token with a conditional update rather than setting the flag on
    # the row read above: that read and this write are two steps, and two
    # refreshes arriving with the same token would both get through between
    # them, each receiving a new pair. Only the one whose update still finds
    # the token unrevoked goes on.
    claim = await session.execute(
        update(RefreshTokenModel)
        .where(
            RefreshTokenModel.id == db_token.id,
            RefreshTokenModel.revoked.is_(False),
        )
        .values(revoked=True)
    )
    await session.commit()
    if cast(CursorResult, claim).rowcount != 1:
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
            RefreshTokenModel.token == form.refresh_token,
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
