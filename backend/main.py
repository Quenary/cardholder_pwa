from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
import models, database, auth, schemas
from env import ACCESS_TOKEN_LIFETIME_MIN, API_PATH
from typing import cast
from starlette.datastructures import Address
from datetime import datetime

app = FastAPI(root_path=API_PATH)
models.Base.metadata.create_all(bind=database.engine)
ACCESS_TOKEN_EXPIRE_SECONDS: int = int(ACCESS_TOKEN_LIFETIME_MIN * 60)


@app.post("/token", response_model=schemas.TokenResponse, tags=["auth"])
def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(database.get_db),
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


@app.post("/token/refresh", response_model=schemas.TokenResponse, tags=["auth"])
def refresh_token(
    request: Request,
    form: schemas.RefreshRequest,
    db: Session = Depends(database.get_db),
):
    db_token = (
        db.query(models.RefreshToken)
        .filter_by(token=form.refresh_token, revoked=False)
        .first()
    )
    if not db_token or db_token.expires_at < datetime.utcnow():
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


@app.post("/logout", tags=["auth"])
def logout(form: schemas.RevokeRequest, db: Session = Depends(database.get_db)):
    auth.revoke_refresh_token(db, form.refresh_token)
    return {"detail": "Logged out successfully."}


@app.post("/user", response_model=schemas.User)
def user_register(user: schemas.UserCreate, db: Session = Depends(database.get_db)):
    if db.query(models.User).filter(models.User.username == user.username).first():
        raise HTTPException(status_code=400, detail="Username already registered")
    new_user = models.User(
        username=user.username,
        email=user.email,
        hashed_password=auth.get_password_hash(user.password),
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@app.get("/user", response_model=schemas.User)
def user_get_info(current_user=Depends(auth.get_current_user)):
    return current_user


@app.get("/cards", response_model=list[schemas.Card])
def get_cards(
    db: Session = Depends(database.get_db), user=Depends(auth.get_current_user)
):
    return db.query(models.Card).filter(models.Card.owner_id == user.id).all()


@app.get("/cards/{card_id}", response_model=schemas.Card)
def get_card(
    card_id: int,
    db: Session = Depends(database.get_db),
    user=Depends(auth.get_current_user),
):
    card = db.query(models.Card).filter_by(id=card_id, owner_id=user.id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    return card


@app.post("/cards", response_model=schemas.Card)
def create_card(
    card: schemas.CardCreate,
    db: Session = Depends(database.get_db),
    user=Depends(auth.get_current_user),
):
    new_card = models.Card(**card.dict(), owner_id=user.id)
    db.add(new_card)
    db.commit()
    db.refresh(new_card)
    return new_card


@app.put("/cards/{card_id}", response_model=schemas.Card)
def update_card(
    card_id: int,
    updated: schemas.CardCreate,
    db: Session = Depends(database.get_db),
    user=Depends(auth.get_current_user),
):
    card = db.query(models.Card).filter_by(id=card_id, owner_id=user.id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    for key, value in updated.dict().items():
        setattr(card, key, value)
    db.commit()
    db.refresh(card)
    return card


@app.delete("/cards/{card_id}")
def delete_card(
    card_id: int,
    db: Session = Depends(database.get_db),
    user=Depends(auth.get_current_user),
):
    card = db.query(models.Card).filter_by(id=card_id, owner_id=user.id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    db.delete(card)
    db.commit()
    return {"detail": "Card deleted"}
