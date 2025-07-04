from pydantic import BaseModel, field_validator, ConfigDict
from typing import Optional
from datetime import datetime, timezone
import re


class CardBase(BaseModel):
    code: str
    code_type: str
    name: str
    description: Optional[str] = None
    color: Optional[str] = None
    isFavorite: Optional[bool] = None

    @field_validator("color")
    @classmethod
    def validate_color(cls, v: str) -> str | None:
        if not v:
            return None
        if not re.search(r"^#(?:[0-9a-fA-F]{3}){1,2}$", v):
            raise ValueError("The card color must match hex color string e.g. #ff00ff")
        return v


class CardCreate(CardBase):
    pass


class CardUpdate(CardBase):
    pass


class CardPatch(BaseModel):
    code: Optional[str] = None
    code_type: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    isFavorite: Optional[bool] = None
    used_at: Optional[datetime] = None

    @field_validator("used_at")
    @classmethod
    def to_utc(cls, v: datetime) -> datetime:
        if not v:
            return v
        if v.tzinfo:
            return v.astimezone(timezone.utc)
        return v.replace(tzinfo=None)

    @field_validator("color")
    @classmethod
    def validate_color(cls, v: str) -> str | None:
        if not v:
            return None
        if not re.search(r"^#(?:[0-9a-fA-F]{3}){1,2}$", v):
            raise ValueError("The card color must match hex color string e.g. #ff00ff")
        return v


class Card(CardBase):
    id: int
    used_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)
