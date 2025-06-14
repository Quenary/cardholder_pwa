from pydantic import BaseModel
from typing import Optional


class Version(BaseModel):
    """Versions schema"""

    app_version: Optional[str] = None
    image_version: Optional[str] = None
