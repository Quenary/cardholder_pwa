from fastapi import FastAPI, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
import models, database, auth, schemas
from env import ACCESS_TOKEN_LIFETIME_MIN, API_PATH
from typing import cast

app = FastAPI(root_path=API_PATH)
models.Base.metadata.create_all(bind=database.engine)
ACCESS_TOKEN_EXPIRE_SECONDS: int = int(ACCESS_TOKEN_LIFETIME_MIN * 60)


@app.post("/token", response_model=schemas.TokenResponse)
def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(database.get_db),
):
    user = auth.authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=400, detail="Incorrect credentials")
    access_token = auth.create_access_token(data={"sub": user.username})
    refresh_token = auth.create_refresh_token(cast(str, user.username))
    return schemas.TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=ACCESS_TOKEN_EXPIRE_SECONDS,
        refresh_token=refresh_token,
    )


@app.post("/token/refresh", response_model=schemas.TokenResponse)
def refresh_token(refresh_token: str):
    new_refresh_token = auth.rotate_refresh_token(refresh_token)
    username = auth.refresh_token_store[new_refresh_token]
    access_token = auth.create_access_token(data={"sub": username})
    return schemas.TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=ACCESS_TOKEN_EXPIRE_SECONDS,
        refresh_token=new_refresh_token,
    )


@app.post("/logout")
def logout(refresh_token: str):
    auth.revoke_refresh_token(refresh_token)
    return {"detail": "Logged out successfully"}


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
