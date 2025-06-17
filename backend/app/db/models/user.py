from .base import Base
from sqlalchemy import Integer, String, DateTime
from sqlalchemy.orm import relationship, mapped_column, Mapped
from datetime import datetime
from typing import TYPE_CHECKING
from app.helpers import now

if TYPE_CHECKING:
    from .card import Card
    from .refresh_token import RefreshToken
    from .password_recovery_code import PasswordRecoveryCode


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String, unique=True, index=True)
    email: Mapped[str] = mapped_column(String, unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=now,
        onupdate=now,
    )
    cards: Mapped[list["Card"]] = relationship("Card", back_populates="user")
    refresh_tokens: Mapped[list["RefreshToken"]] = relationship(
        "RefreshToken", back_populates="user"
    )
    password_recovery_codes: Mapped[list["PasswordRecoveryCode"]] = relationship(
        "PasswordRecoveryCode", back_populates="user"
    )
