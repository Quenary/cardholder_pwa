from pydantic import BaseModel, EmailStr, field_validator, model_validator
import re
from typing import Self


class PasswordRecoveryCodeBody(BaseModel):
    """Password restoration code request schema"""

    email: EmailStr


class PasswordRecoverySubmitBody(BaseModel):
    """Password restoration submit request schema"""

    code: str
    password: str
    confirm_password: str

    @field_validator("password", "confirm_password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if not re.search(r"[A-Z]", v):
            raise ValueError("The password must contain at least one uppercase letter.")
        if not re.search(r"[a-z]", v):
            raise ValueError("The password must contain at least one lowercase letter.")
        if not re.search(r"\d", v):
            raise ValueError("The password must contain at least one number.")
        return v

    @model_validator(mode="after")
    def check_passwords_match(self) -> Self:
        if self.password != self.confirm_password:
            raise ValueError("Passwords do not match.")
        return self
