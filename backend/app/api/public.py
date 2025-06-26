from fastapi import APIRouter, Depends, HTTPException
import os
from sqlalchemy import text, select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Any

from app.db import get_async_session
from app.db import models
import app.schemas as schemas
from app.enums import ESettingKey
from app.helpers import get_setting_typed_value
from app.config import Config


router = APIRouter(tags=["public"], prefix="/public")


@router.get("/version", response_model=schemas.Version)
def get_version():
    image_version = os.getenv("VERSION") or None
    return {"image_version": image_version}


@router.get("/health")
async def health(session: AsyncSession = Depends(get_async_session)):
    try:
        await session.execute(text("SELECT 1"))
        return "OK"
    except Exception:
        raise HTTPException(503, "db_error")


@router.get(
    "/settings",
    response_model=list[schemas.PublicSettingsItem],
    description="Returns list of several app settings and environment variables. Key ",
)
async def settings(session: AsyncSession = Depends(get_async_session)):
    result_list: list[dict[str, Any]] = []

    public_keys = [ESettingKey.ALLOW_REGISTRATION]
    stmt = select(models.Setting).where(models.Setting.key.in_(public_keys))
    result = await session.execute(stmt)
    settings = result.scalars()
    for s in settings:
        result_list.append(
            {"key": s.key, "value": get_setting_typed_value(s.value, s.value_type)}
        )

    public_keys = ["SMTP_DISABLED"]
    for pk in public_keys:
        value = getattr(Config, pk) if hasattr(Config, pk) else None
        result_list.append({"key": pk, "value": value})
    return result_list
