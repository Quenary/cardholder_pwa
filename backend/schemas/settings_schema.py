from datetime import datetime

from pydantic import BaseModel


class PatchSettingsRequestItemSchema(BaseModel):
    key: str
    value: bool | int | float | str


class GetSettingsRequestItemSchema(PatchSettingsRequestItemSchema):
    value_type: str
    updated_at: datetime
