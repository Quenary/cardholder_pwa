from pydantic import BaseModel
from typing import Optional


class VersionSchema(BaseModel):
    """Versions schema"""

    image_version: Optional[str] = None
