import re
from datetime import UTC, datetime

from pydantic import BaseModel, ConfigDict, Field, computed_field, field_validator


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
    # Read from the model but never sent to clients: the file name is an
    # internal detail, the client only needs to know whether a logo exists
    # and can then fetch /cards/{id}/logo.
    logo_file: str | None = Field(default=None, exclude=True)
    model_config = ConfigDict(from_attributes=True)

    # mypy does not support decorators stacked on @property; this is the
    # workaround documented by pydantic for computed fields.
    @computed_field  # type: ignore[prop-decorator]
    @property
    def has_logo(self) -> bool:
        return bool(self.logo_file)
