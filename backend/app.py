from fastapi import FastAPI
from backend.config import Config
from backend.api import (
    auth_router,
    user_router,
    card_router,
    password_recovery_router,
    public_router,
    admin_router,
)
import asyncio
from backend.db import cleanup
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
app.include_router(public_router)
app.include_router(admin_router)
