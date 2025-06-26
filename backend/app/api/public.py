from fastapi import APIRouter, Depends, HTTPException
from app.schemas import Version
import os
from app.db import get_async_session
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(tags=["public"], prefix="/public")


@router.get("/version", response_model=Version)
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
