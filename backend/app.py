import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exception_handlers import request_validation_exception_handler
from fastapi.exceptions import RequestValidationError

from backend.api import (
    admin_router,
    auth_router,
    card_router,
    card_share_router,
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


@app.exception_handler(RequestValidationError)
async def log_request_validation_error(request: Request, exc: RequestValidationError):
    # FastAPI 422s never reach the route, so they used to show up as a bare
    # access-log line. Log loc/type/msg only: `input` can be the whole body.
    logger = logging.getLogger("backend.validation")
    logger.info(
        "422 %s %s: %s",
        request.method,
        request.url.path,
        [
            {k: err[k] for k in ("type", "loc", "msg") if k in err}
            for err in exc.errors()
        ],
    )
    return await request_validation_exception_handler(request, exc)


app.include_router(auth_router)
app.include_router(user_router)
app.include_router(card_share_router)
app.include_router(card_router)
app.include_router(password_recovery_router)
app.include_router(public_router)
app.include_router(admin_router)
