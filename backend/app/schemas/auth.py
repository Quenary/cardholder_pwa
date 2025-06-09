from pydantic import BaseModel


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    expires_in: int
    refresh_token: str


class RefreshRequest(BaseModel):
    refresh_token: str


class RevokeRequest(RefreshRequest):
    pass
