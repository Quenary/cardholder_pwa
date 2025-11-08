from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text, select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Any
from backend.db.session import get_async_session
from backend.db.models.settings_model import SettingModel
from backend.schemas.version_schema import VersionSchema
from backend.schemas.public_settings_schema import (
    PublicSettingsItemSchema,
)
from backend.enums.settings_enum import ESettingKey
from backend.helpers.get_setting_typed_value import get_setting_typed_value
from backend.config import Config


router = APIRouter(tags=["public"], prefix="/public")


@router.get("/version", response_model=VersionSchema)
def get_version():
    try:
        with open("/app/version", "r") as file:
            return {"image_version": file.readline()}
    except FileNotFoundError:
        raise HTTPException(404, "Version file not found")


@router.get("/health")
async def health(session: AsyncSession = Depends(get_async_session)):
    try:
        await session.execute(text("SELECT 1"))
        return "OK"
    except Exception:
        raise HTTPException(503, "db_error")


@router.get(
    "/settings",
    response_model=list[PublicSettingsItemSchema],
    description="Get list of several app settings and environment variables",
)
async def settings(
    session: AsyncSession = Depends(get_async_session),
):
    result_list: list[dict[str, Any]] = []

    public_keys = [ESettingKey.ALLOW_REGISTRATION]
    stmt = select(SettingModel).where(
        SettingModel.key.in_(public_keys)
    )
    result = await session.execute(stmt)
    settings = result.scalars()
    for s in settings:
        result_list.append(
            {
                "key": s.key,
                "value": get_setting_typed_value(
                    s.value, s.value_type
                ),
            }
        )

    public_keys = ["SMTP_DISABLED"]
    for pk in public_keys:
        value = getattr(Config, pk) if hasattr(Config, pk) else None
        result_list.append({"key": pk, "value": value})
    return result_list
