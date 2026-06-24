import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from backend.api import (
    admin_router,
    auth_router,
    card_router,
    password_recovery_router,
    public_router,
    user_router,
)
from backend.config import Config
from backend.db.cleanup import cleanup

logging.basicConfig(
    level=Config.LOG_LEVEL,
    format="BACKEND - %(levelname)s - %(name)s: %(message)s",
    force=True,
)

uvicorn_logger = logging.getLogger("uvicorn.access")
uvicorn_logger.setLevel(Config.LOG_LEVEL)


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
