from pydantic import BaseModel, ConfigDict

from backend.schemas.card_schema import CardSchema


class ShareUserSchema(BaseModel):
    id: int
    username: str

    model_config = ConfigDict(from_attributes=True)


class SharedCardItemSchema(BaseModel):
    card: CardSchema
    shared_with_users: list[ShareUserSchema]


class SharedWithMeItemSchema(BaseModel):
    card: CardSchema
    owner: ShareUserSchema


class SharedCardsResponseSchema(BaseModel):
    you_share: list[SharedCardItemSchema]
    shared_with_you: list[SharedWithMeItemSchema]


class ShareCardRequestSchema(BaseModel):
    card_id: int
    user_ids: list[int]


class UpdateCardShareRequestSchema(BaseModel):
    user_ids: list[int]


class ShareAllCardsRequestSchema(BaseModel):
    user_ids: list[int]
