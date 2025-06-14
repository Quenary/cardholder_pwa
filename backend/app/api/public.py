from fastapi import APIRouter
from app.schemas import Version
import tomllib
import os

router = APIRouter(tags=["public"], prefix="/public")


@router.get("/version", response_model=Version)
def get_version():
    image_version = os.getenv("VERSION") or None
    toml_path = os.path.join(os.path.dirname(__file__), "..", "..", "pyproject.toml")
    with open(toml_path, "rb") as f:
        toml_data = tomllib.load(f)
        app_version = toml_data["project"]["version"]
    return {"app_version": app_version, "image_version": image_version}
