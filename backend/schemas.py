from pydantic import BaseModel, EmailStr
from typing import Optional


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


class User(BaseModel):
    id: int
    username: str
    email: EmailStr

    class Config:
        from_attributes = True
