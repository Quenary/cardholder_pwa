from pydantic import BaseModel, EmailStr, field_validator, model_validator
from typing import Self
from .validators import password_validator


class PasswordRecoveryCodeRequestSchema(BaseModel):
    """Password restoration code request schema"""

    email: EmailStr


class PasswordRecoverySubmitSchema(BaseModel):
    """Password restoration submit request schema"""

    code: str
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
