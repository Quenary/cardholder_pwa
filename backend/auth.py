from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from datetime import datetime, timedelta
from passlib.context import CryptContext
from sqlalchemy.orm import Session
import models, database
from typing import cast
from env import (
    JWT_SECRET_KEY,
    JWT_ALGORITHM,
    ACCESS_TOKEN_LIFETIME_MIN,
    REFRESH_TOKEN_LIFETIME_MIN,
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/token")
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# В реальном приложении - хранить в Redis или БД
refresh_token_store = {}


def verify_password(plain: str, hashed) -> bool:
    return pwd_context.verify(plain, hashed)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def authenticate_user(db: Session, username: str, password: str) -> models.User | None:
    user = db.query(models.User).filter(models.User.username == username).first()
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user


def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (
        expires_delta or timedelta(minutes=ACCESS_TOKEN_LIFETIME_MIN)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def create_refresh_token(username: str):
    expire = datetime.utcnow() + timedelta(minutes=REFRESH_TOKEN_LIFETIME_MIN)
    to_encode = {"sub": username, "exp": expire, "type": "refresh"}
    token = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    refresh_token_store[token] = username
    return token


def rotate_refresh_token(old_token: str):
    username = validate_refresh_token(old_token)
    # Удаляем старый токен
    refresh_token_store.pop(old_token, None)
    # Создаем новый
    return create_refresh_token(username)


def validate_refresh_token(token: str) -> str:
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=403, detail="Invalid token type")
        username = cast(str, payload.get("sub"))
        print(username)
        print(token)
        if token not in refresh_token_store or refresh_token_store[token] != username:
            raise HTTPException(status_code=403, detail="Token revoked")
        return username
    except JWTError:
        raise HTTPException(status_code=403, detail="Invalid token")


async def get_current_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(database.get_db)
) -> models.User:
    credentials_exception = HTTPException(status_code=401, detail="Invalid token")
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        username: str = cast(str, payload.get("sub"))
        if not username:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = db.query(models.User).filter(models.User.username == username).first()
    if not user:
        raise credentials_exception
    return user


def revoke_refresh_token(token: str):
    if token in refresh_token_store:
        refresh_token_store.pop(token)
    else:
        raise HTTPException(status_code=404, detail="Token not found")
