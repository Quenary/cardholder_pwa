from pydantic import BaseModel
from typing import Optional


class Version(BaseModel):
    """Versions schema"""

    image_version: Optional[str] = None
