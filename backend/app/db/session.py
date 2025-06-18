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
        url = url.replace("postgresql+psycopg2:", "postgresql+asyncpg:")
    else:
        url = url.replace("sqlite+aiosqlite:", "sqlite:")
        url = url.replace("postgresql+asyncpg:", "postgresql+psycopg2:")
    return url


def _get_connect_args(
    url: str,
) -> dict:
    if "sqlite:" in url:
        return {"check_same_thread": False, "timeout": 15}
    elif "sqlite+aiosqlite:" in url:
        return {"timeout": 15}
    return {}


sync_url = _get_db_url(False)
engine = engine = create_engine(
    sync_url,
    connect_args=_get_connect_args(sync_url),
    pool_pre_ping=True,
    pool_recycle=1800,
    echo=False,
)
_session_maker = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
    expire_on_commit=False,
)


def get_db() -> Generator[Session, None, None]:
    db = _session_maker()
    try:
        yield db
    finally:
        db.close()


async_url = _get_db_url(True)
async_engine = async_engine = create_async_engine(
    async_url,
    connect_args=_get_connect_args(async_url),
    pool_pre_ping=True,
    pool_recycle=1800,
    echo=False,
)
_async_session_maker = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_async_db() -> AsyncGenerator[AsyncSession, None]:
    async with _async_session_maker() as session:
        yield session
