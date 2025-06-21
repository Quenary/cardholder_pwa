from fastapi import APIRouter, Depends, HTTPException, status, Request
import app.db.models as models, app.db as db, app.schemas as schemas, app.core.auth as auth
from fastapi.security import OAuth2PasswordRequestForm
from app.helpers import now
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

router = APIRouter(tags=["auth"])


@router.post("/token", response_model=schemas.TokenResponse)
async def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    session: AsyncSession = Depends(db.get_async_session),
):
    user = await auth.authenticate_user(session, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token, access_exp = auth.create_access_token({"sub": user.username})
    refresh_token = await auth.create_refresh_token(
        user.id,
        session,
        request.headers.get("user-agent"),
        request.client.host if request.client else None,
    )
    return auth.build_token_response(access_token, access_exp, refresh_token)


@router.post("/token/refresh", response_model=schemas.TokenResponse)
async def refresh_token(
    request: Request,
    form: schemas.RefreshRequest,
    session: AsyncSession = Depends(db.get_async_session),
):
    stmt = (
        select(models.RefreshToken)
        .where(
            models.RefreshToken.token == form.refresh_token,
            models.RefreshToken.revoked == False,
            models.RefreshToken.expires_at > now(),
        )
        .options(selectinload(models.RefreshToken.user))
        .limit(1)
    )
    result = await session.execute(stmt)
    db_token = result.scalar_one_or_none()
    if not db_token:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    db_token.revoked = True
    await session.commit()

    user = db_token.user
    access_token, access_exp = auth.create_access_token({"sub": user.username})
    new_refresh = await auth.create_refresh_token(
        user.id,
        session,
        request.headers.get("user-agent"),
        request.client.host if request.client else None,
    )
    return auth.build_token_response(access_token, access_exp, new_refresh)


@router.post("/logout")
async def logout(
    form: schemas.RevokeRequest,
    session: AsyncSession = Depends(db.get_async_session),
    _=Depends(auth.is_user),
):
    stmt = (
        select(models.RefreshToken)
        .where(
            models.RefreshToken.token == form.refresh_token,
            models.RefreshToken.revoked == False,
        )
        .limit(1)
    )
    result = await session.execute(stmt)
    db_token = result.scalar_one_or_none()
    if db_token:
        db_token.revoked = True
        await session.commit()
    return {"detail": "Logged out successfully."}
