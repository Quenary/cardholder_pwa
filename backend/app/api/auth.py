from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
import app.db.models as models, app.db as db, app.schemas as schemas, app.core.auth as auth
from fastapi.security import OAuth2PasswordRequestForm
from typing import cast
from starlette.datastructures import Address
from app.helpers import now

router = APIRouter(tags=["auth"])


@router.post("/token", response_model=schemas.TokenResponse)
def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(db.get_db),
):
    user = auth.authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token, access_exp = auth.create_access_token({"sub": user.username})
    refresh_token = auth.create_refresh_token(
        user.id,
        db,
        request.headers.get("user-agent"),
        cast(Address, request.client).host,
    )
    return auth.build_token_response(access_token, access_exp, refresh_token)


@router.post("/token/refresh", response_model=schemas.TokenResponse)
def refresh_token(
    request: Request,
    form: schemas.RefreshRequest,
    db: Session = Depends(db.get_db),
):
    db_token = (
        db.query(models.RefreshToken)
        .filter_by(token=form.refresh_token, revoked=False)
        .first()
    )
    if not db_token or db_token.expires_at < now():
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")
    user = db_token.user
    auth.revoke_refresh_token(db, db_token.token)
    access_token, access_exp = auth.create_access_token({"sub": user.username})
    new_refresh = auth.create_refresh_token(
        user.id,
        db,
        request.headers.get("user-agent"),
        cast(Address, request.client).host,
    )
    return auth.build_token_response(access_token, access_exp, new_refresh)


@router.post("/logout")
def logout(form: schemas.RevokeRequest, db: Session = Depends(db.get_db)):
    auth.revoke_refresh_token(db, form.refresh_token)
    return {"detail": "Logged out successfully."}
