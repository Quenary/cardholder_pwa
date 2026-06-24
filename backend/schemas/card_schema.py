import re
from datetime import UTC, datetime

from pydantic import BaseModel, ConfigDict, field_validator


class CardBaseSchema(BaseModel):
    code: str
    code_type: str
    name: str
    description: str | None = None
    color: str | None = None
    is_favorite: bool | None = None

    @field_validator("color")
    @classmethod
    def validate_color(cls, v: str) -> str | None:
        if not v:
            return None
        if not re.search(r"^#(?:[0-9a-fA-F]{3}){1,2}$", v):
            raise ValueError("The card color must match hex color string e.g. #ff00ff")
        return v


class CardCreateSchema(CardBaseSchema):
    pass


class CardUpdateSchema(CardBaseSchema):
    pass


class CardPatchSchema(BaseModel):
    code: str | None = None
    code_type: str | None = None
    name: str | None = None
    description: str | None = None
    color: str | None = None
    is_favorite: bool | None = None
    used_at: datetime | None = None

    @field_validator("used_at")
    @classmethod
    def to_utc(cls, v: datetime) -> datetime:
        if not v:
            return v
        if v.tzinfo:
            return v.astimezone(UTC).replace(tzinfo=None)
        return v

    @field_validator("color")
    @classmethod
    def validate_color(cls, v: str) -> str | None:
        if not v:
            return None
        if not re.search(r"^#(?:[0-9a-fA-F]{3}){1,2}$", v):
            raise ValueError("The card color must match hex color string e.g. #ff00ff")
        return v


class CardSchema(CardBaseSchema):
    id: int
    used_at: datetime | None
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)
