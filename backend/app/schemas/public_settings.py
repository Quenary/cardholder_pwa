from typing import Union
from pydantic import BaseModel


class PublicSettingsItem(BaseModel):
    key: str
    value: Union[bool, int, float, str, None] = None