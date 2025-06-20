from pydantic import BaseModel, RootModel
from typing import Union


class PatchSettingsRequestItem(BaseModel):
    key: str
    value: Union[bool, int, float, str]


class GetSettingsRequestItem(PatchSettingsRequestItem):
    value_type: str
    updated_at: str


class GetSettingsRequest(RootModel[list[GetSettingsRequestItem]]):
    pass
