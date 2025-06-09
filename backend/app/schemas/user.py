from pydantic import BaseModel, EmailStr


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
