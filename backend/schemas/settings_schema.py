from pydantic import BaseModel, RootModel
from typing import Union
from datetime import datetime


class PatchSettingsRequestItemSchema(BaseModel):
    key: str
    value: Union[bool, int, float, str]


class GetSettingsRequestItemSchema(PatchSettingsRequestItemSchema):
    value_type: str
    updated_at: datetime