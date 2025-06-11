from pydantic import BaseModel
from typing import Optional


class CardBase(BaseModel):
    code: str
    code_type: str
    name: str
    description: Optional[str] = None


class CardCreate(CardBase):
    pass


class CardUpdate(CardBase):
    pass


class Card(CardBase):
    id: int

    class Config:
        from_attributes = True
