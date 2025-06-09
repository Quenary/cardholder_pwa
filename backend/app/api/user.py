from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import app.db.models as models, app.db as db, app.schemas as schemas, app.core.auth as auth

router = APIRouter(tags=["user"])


@router.post("/user", response_model=schemas.User)
def user_register(user: schemas.UserCreate, db: Session = Depends(db.get_db)):
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


@router.get("/user", response_model=schemas.User)
def user_get_info(current_user=Depends(auth.get_current_user)):
    return current_user


@router.put("/user")
def update_user(
    data: schemas.UserUpdate,
    db: Session = Depends(db.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    if not current_user:
        raise HTTPException(status_code=404, detail="User not found")
    if data.username:
        current_user.username = data.username
    if data.email:
        current_user.email = data.email
    if data.password:
        current_user.hashed_password = auth.get_password_hash(data.password)
    db.commit()
    return current_user


@router.delete("/user")
def delete_user(
    db: Session = Depends(db.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    if not current_user:
        raise HTTPException(status_code=404, detail="User not found")
    db.query(models.Card).filter_by(owner_id=current_user.id).delete()
    db.query(models.RefreshToken).filter_by(user_id=current_user.id).delete()
    db.delete(current_user)
    db.commit()
    return {"detail": "User and all related data deleted"}
