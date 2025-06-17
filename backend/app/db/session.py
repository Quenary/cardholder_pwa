from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from app.config import Config
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from typing import Generator, AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession


def _get_db_url(is_async: bool) -> str:
    url = Config.DB_URL
    if is_async:
        url = url.replace("sqlite:", "sqlite+aiosqlite:")
    else:
        url = url.replace("sqlite+aiosqlite:", "sqlite:")
    return url


engine = create_engine(_get_db_url(False), connect_args={"check_same_thread": False})
_session_maker = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_db() -> Generator[Session, None, None]:
    db = _session_maker()
    try:
        yield db
    finally:
        db.close()


async_engine = create_async_engine(_get_db_url(True), echo=False)
_async_session_maker = async_sessionmaker(
    async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_async_db() -> AsyncGenerator[AsyncSession, None]:
    async with _async_session_maker() as session:
        yield session
