from fastapi import APIRouter, Depends, HTTPException, status, Request
from backend.core.auth_core import (
    create_access_token,
    create_refresh_token,
    authenticate_user,
    build_token_response,
    is_user,
)
from backend.db.session import get_async_session
from backend.schemas.auth_schema import (
    TokenResponseSchema,
    RefreshRequestSchema,
    RevokeRequestSchema,
)
from backend.db.models.refresh_token_model import RefreshTokenModel
from fastapi.security import OAuth2PasswordRequestForm
from backend.helpers.now import now
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from backend.helpers.delay_to_minimum import delay_to_minimum

router = APIRouter(tags=["auth"])


@router.post("/token", response_model=TokenResponseSchema)
@delay_to_minimum(1)
async def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    session: AsyncSession = Depends(get_async_session),
):
    user = await authenticate_user(
        session, form_data.username, form_data.password
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token, access_exp = create_access_token(
        {"sub": user.username}
    )
    refresh_token = await create_refresh_token(
        user.id,
        session,
        request.headers.get("user-agent"),
        request.client.host if request.client else None,
    )
    return build_token_response(
        access_token, access_exp, refresh_token
    )


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
            RefreshTokenModel.revoked == False,
            RefreshTokenModel.expires_at > now(),
        )
        .options(selectinload(RefreshTokenModel.user))
        .limit(1)
    )
    result = await session.execute(stmt)
    db_token = result.scalar_one_or_none()
    if not db_token:
        raise HTTPException(
            status_code=401, detail="Invalid or expired refresh token"
        )

    db_token.revoked = True
    await session.commit()

    user = db_token.user
    access_token, access_exp = create_access_token(
        {"sub": user.username}
    )
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
    _=Depends(is_user),
):
    stmt = (
        select(RefreshTokenModel)
        .where(
            RefreshTokenModel.token == form.refresh_token,
            RefreshTokenModel.revoked == False,
        )
        .limit(1)
    )
    result = await session.execute(stmt)
    db_token = result.scalar_one_or_none()
    if db_token:
        db_token.revoked = True
        await session.commit()
    return {"detail": "Logged out successfully."}
