from datetime import datetime
from typing import Self

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    field_validator,
    model_validator,
)

from backend.enums.user_role_enum import EUserRole

from .validators import password_validator


class UserCreateSchema(BaseModel):
    """User create schema. Passwords required."""

    username: str
    email: EmailStr
    password: str
    confirm_password: str

    @field_validator("password", "confirm_password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        return password_validator(v)

    @model_validator(mode="after")
    def check_passwords_match(self) -> Self:
        if self.password != self.confirm_password:
            raise ValueError("Passwords do not match.")
        return self


class UserUpdateSchema(BaseModel):
    """User update schema. Passwords optional"""

    username: str
    email: EmailStr
    password: str | None = None
    confirm_password: str | None = None

    @field_validator("password", "confirm_password")
    @classmethod
    def validate_password(cls, v: str) -> str | None:
        if not v:
            return None
        return password_validator(v)

    @model_validator(mode="after")
    def check_passwords_match(self) -> Self:
        if self.password != self.confirm_password:
            raise ValueError("Passwords do not match.")
        return self


class UserSchema(BaseModel):
    id: int
    username: str
    email: EmailStr
    created_at: datetime
    updated_at: datetime
    role_code: EUserRole

    model_config = ConfigDict(from_attributes=True)
