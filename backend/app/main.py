from fastapi import FastAPI
from app.db import Base, engine
from app.env import API_PATH
from app.api import auth_router, user_router, card_router

Base.metadata.create_all(bind=engine)
app = FastAPI(root_path=API_PATH)
app.include_router(auth_router)
app.include_router(user_router)
app.include_router(card_router)
