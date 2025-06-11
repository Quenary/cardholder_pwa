from pydantic import BaseModel, EmailStr


class PasswordRecoveryCodeBody(BaseModel):
    """Password restoration code request schema"""
    email: EmailStr


class PasswordRecoverySubmitBody(BaseModel):
    """Password restoration submit request schema"""
    code: str
    password: str
