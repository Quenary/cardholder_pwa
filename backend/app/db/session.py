from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.config import Config


engine = create_engine(Config.DB_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
