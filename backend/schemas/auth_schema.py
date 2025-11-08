from pydantic import BaseModel


class TokenResponseSchema(BaseModel):
    access_token: str
    token_type: str
    expires_in: int
    refresh_token: str


class RefreshRequestSchema(BaseModel):
    refresh_token: str


class RevokeRequestSchema(RefreshRequestSchema):
    pass
