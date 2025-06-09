from pydantic import BaseModel, EmailStr
from typing import Optional


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    expires_in: int
    refresh_token: str

class RefreshRequest(BaseModel):
    refresh_token: str
    
class RevokeRequest(RefreshRequest):
    pass

class CardBase(BaseModel):
    code: str
    code_type: str
    name: str
    description: Optional[str] = None


class CardCreate(CardBase):
    pass


class Card(CardBase):
    id: int

    class Config:
        from_attributes = True


class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str

class UserUpdate(UserCreate):
    pass


class User(BaseModel):
    id: int
    username: str
    email: EmailStr

    class Config:
        from_attributes = True
