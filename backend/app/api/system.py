from fastapi import APIRouter, Depends, HTTPException
from app.schemas import Version
import tomllib
import os
import app.core.auth as auth
from app.db import get_async_db
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models import User

router = APIRouter(tags=["system"], prefix="/system")


@router.get("/version", response_model=Version)
def get_version(_: User = Depends(auth.is_user)):
    image_version = os.getenv("VERSION") or None
    toml_path = os.path.join(os.path.dirname(__file__), "..", "..", "pyproject.toml")
    with open(toml_path, "rb") as f:
        toml_data = tomllib.load(f)
        app_version = toml_data["project"]["version"]
    return {"app_version": app_version, "image_version": image_version}


@router.get("/health")
async def health(db: AsyncSession = Depends(get_async_db)):
    try:
        await db.execute(text("SELECT 1"))
        return "OK"
    except Exception:
        raise HTTPException(503, "db_error")
