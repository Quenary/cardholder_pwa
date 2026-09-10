from collections.abc import AsyncGenerator

from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from backend.config import Config


def _get_async_url() -> str:
    url = Config.DB_URL
    if url.startswith("sqlite:"):
        url = url.replace("sqlite:", "sqlite+aiosqlite:")
    elif url.startswith("postgresql+psycopg2:"):
        url = url.replace("postgresql+psycopg2:", "postgresql+asyncpg:")
    elif url.startswith("mysql+pymysql:"):
        url = url.replace("mysql+pymysql:", "mysql+asyncmy:")
    elif url.startswith("mysql:"):
        url = url.replace("mysql:", "mysql+asyncmy:")
    return url


def _get_connect_args(
    url: str,
) -> dict:
    if "sqlite+aiosqlite:" in url:
        return {"timeout": 15}
    return {}


async_url = _get_async_url()
async_engine = create_async_engine(
    async_url,
    connect_args=_get_connect_args(async_url),
    pool_pre_ping=True,
    pool_recycle=1800,
    echo=False,
)
if async_engine.dialect.name == "sqlite":

    @event.listens_for(async_engine.sync_engine, "connect")
    def _set_sqlite_pragmas(dbapi_connection, _connection_record):
        """Put SQLite in WAL mode, on every connection.

        In the default rollback journal a writer blocks readers for the whole
        transaction. WAL lets them run alongside each other, which is what
        keeps a background write from turning into a lock timeout in the
        middle of somebody opening their cards.

        Foreign keys are deliberately left alone. Switching them on here also
        switches them on for migrations, and the batch table rebuilds fail
        with "FOREIGN KEY constraint failed" on any database that already has
        rows in it.
        """
        cursor = dbapi_connection.cursor()
        try:
            cursor.execute("PRAGMA journal_mode=WAL")
        finally:
            cursor.close()


_async_session_maker = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_async_session() -> AsyncGenerator[AsyncSession]:
    async with _async_session_maker() as session:
        yield session
