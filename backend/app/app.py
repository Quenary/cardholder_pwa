from fastapi import FastAPI
from app.config import Config
from app.api import (
    auth_router,
    user_router,
    card_router,
    password_recovery_router,
    system_router,
)

app = FastAPI(root_path=Config.API_PATH)
app.include_router(auth_router)
app.include_router(user_router)
app.include_router(card_router)
app.include_router(password_recovery_router)
app.include_router(system_router)
