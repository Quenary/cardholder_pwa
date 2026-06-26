from pydantic import BaseModel


class VersionSchema(BaseModel):
    """Versions schema"""

    image_version: str | None = None
