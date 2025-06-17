from fastapi import FastAPI
from app.config import Config
from app.api import (
    auth_router,
    user_router,
    card_router,
    password_recovery_router,
    system_router,
)
import asyncio
from app.db import cleanup
from contextlib import asynccontextmanager


@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(cleanup())

    yield  # app runs

    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass


app = FastAPI(root_path=Config.API_PATH, lifespan=lifespan)
app.include_router(auth_router)
app.include_router(user_router)
app.include_router(card_router)
app.include_router(password_recovery_router)
app.include_router(system_router)
