from pydantic import BaseModel


class PublicSettingsItemSchema(BaseModel):
    key: str
    value: bool | int | float | str | None = None
