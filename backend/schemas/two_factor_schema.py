from typing import Literal

from pydantic import BaseModel

from backend.schemas.auth_schema import TokenResponseSchema


class TwoFactorChallengeSchema(BaseModel):
    two_factor_required: Literal[True] = True
    challenge_token: str
    expires_in: int


class TwoFactorVerifySchema(BaseModel):
    challenge_token: str
    code: str


class TwoFactorSetupResponseSchema(BaseModel):
    secret: str
    otpauth_uri: str


class TwoFactorPasswordCodeSchema(BaseModel):
    password: str
    code: str


class TwoFactorEnableResponseSchema(BaseModel):
    recovery_codes: list[str]
    tokens: TokenResponseSchema | None = None


class TwoFactorDisableResponseSchema(BaseModel):
    tokens: TokenResponseSchema | None = None


class TwoFactorRecoveryCodesResponseSchema(BaseModel):
    recovery_codes: list[str]
