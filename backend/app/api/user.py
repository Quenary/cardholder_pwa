from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import app.db.models as models, app.db as db, app.schemas as schemas, app.core.auth as auth, app.enums as enums
from app.core.user import delete_user as _delete_user

router = APIRouter(tags=["user"])


@router.post("/user", response_model=schemas.User)
def create_user(
    user: schemas.UserCreate,
    db: Session = Depends(db.get_db),
    allow=Depends(auth.allow_registration),
):
    exception = HTTPException(
        status_code=400, detail="Username or email is already registered"
    )
    if db.query(models.User).filter(models.User.username == user.username).first():
        raise exception
    if db.query(models.User).filter(models.User.email == user.email).first():
        raise exception

    is_first = db.query(models.User).count() == 0

    print(is_first)

    new_user = models.User(
        username=user.username,
        email=user.email,
        hashed_password=auth.get_password_hash(user.password),
    )
    if is_first:
        new_user.role_code = enums.EUserRole.OWNER
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.get("/user", response_model=schemas.User)
def get_user(current_user=Depends(auth.is_user)):
    return current_user


@router.put("/user", response_model=schemas.User)
def update_user(
    data: schemas.UserUpdate,
    db: Session = Depends(db.get_db),
    current_user: models.User = Depends(auth.is_user),
):
    exception = HTTPException(
        status_code=400, detail="Username or email is already registered"
    )
    if data.username != current_user.username:
        if db.query(models.User).filter_by(username=data.username).first():
            raise exception
        current_user.username = data.username
    if data.email != current_user.email:
        if db.query(models.User).filter_by(email=data.email).first():
            raise exception
        current_user.email = data.email
    if data.password:
        current_user.hashed_password = auth.get_password_hash(data.password)
    db.commit()
    return current_user


@router.delete("/user")
def delete_user(
    db: Session = Depends(db.get_db),
    current_user: models.User = Depends(auth.is_user),
):
    return _delete_user(db, current_user)
