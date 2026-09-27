import re
from datetime import UTC, datetime

from pydantic import BaseModel, ConfigDict, Field, computed_field, field_validator

# Upper bounds on the free-text fields. The columns themselves are unbounded,
# so without these a card could be created with a name of several megabytes,
# as many times as wanted. The code limit is set by what the densest supported
# symbology can carry (a QR code holds about 4300 alphanumeric characters).
CODE_MAX_LENGTH = 4096
CODE_TYPE_MAX_LENGTH = 50
NAME_MAX_LENGTH = 200
DESCRIPTION_MAX_LENGTH = 2000


class CardBaseSchema(BaseModel):
    code: str = Field(max_length=CODE_MAX_LENGTH)
    code_type: str = Field(max_length=CODE_TYPE_MAX_LENGTH)
    name: str = Field(max_length=NAME_MAX_LENGTH)
    description: str | None = Field(default=None, max_length=DESCRIPTION_MAX_LENGTH)
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


def _reject_null(v: object) -> object:
    """Refuse an explicit null for a column that cannot hold one.

    Field validators only run on values that were actually sent, so leaving a
    field out is still fine. Sending it as null used to reach the database and
    come back as a 500 from the NOT NULL constraint.
    """
    if v is None:
        raise ValueError("This field cannot be null")
    return v


class CardCreateSchema(CardBaseSchema):
    pass


class CardUpdateSchema(CardBaseSchema):
    _is_favorite_not_null = field_validator("is_favorite")(_reject_null)


class CardPatchSchema(BaseModel):
    code: str | None = Field(default=None, max_length=CODE_MAX_LENGTH)
    code_type: str | None = Field(default=None, max_length=CODE_TYPE_MAX_LENGTH)
    name: str | None = Field(default=None, max_length=NAME_MAX_LENGTH)
    description: str | None = Field(default=None, max_length=DESCRIPTION_MAX_LENGTH)
    color: str | None = None
    is_favorite: bool | None = None
    used_at: datetime | None = None

    _not_null = field_validator("code", "code_type", "name", "is_favorite")(
        _reject_null
    )

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
