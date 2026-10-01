from pydantic import BaseModel, ConfigDict

from backend.enums.card_share_status_enum import ECardShareStatus
from backend.schemas.card_schema import CardSchema


class ShareUserSchema(BaseModel):
    id: int
    username: str

    model_config = ConfigDict(from_attributes=True)


class ShareUsersPageSchema(BaseModel):
    """One page of the accounts a card can be shared with."""

    items: list[ShareUserSchema]
    total: int
    limit: int
    offset: int


class ShareRecipientSchema(ShareUserSchema):
    """A recipient of a card, with what they decided about it."""

    status: ECardShareStatus


class SharedCardItemSchema(BaseModel):
    card: CardSchema
    shared_with_users: list[ShareRecipientSchema]


class SharedWithMeItemSchema(BaseModel):
    card: CardSchema
    owner: ShareUserSchema
    status: ECardShareStatus


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
