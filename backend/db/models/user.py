from .base import Base
from sqlalchemy import ForeignKey, Integer, String, DateTime, text, Enum as SQLEnum
from sqlalchemy.orm import relationship, mapped_column, Mapped
from datetime import datetime
from typing import TYPE_CHECKING
from backend.helpers import now
from backend.enums import EUserRole


if TYPE_CHECKING:
    from .card import Card
    from .refresh_token import RefreshToken
    from .password_recovery_code import PasswordRecoveryCode
    from .user_role import UserRole


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, index=True, nullable=False
    )
    username: Mapped[str] = mapped_column(
        String, unique=True, index=True, nullable=False
    )
    email: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=text("CURRENT_TIMESTAMP"), default=now, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=text("CURRENT_TIMESTAMP"),
        server_onupdate=text("CURRENT_TIMESTAMP"),
        onupdate=now,
        default=now,
        nullable=False,
    )
    role_code: Mapped[EUserRole] = mapped_column(
        SQLEnum(EUserRole, native_enum=False),
        ForeignKey("user_roles.code"),
        server_default=EUserRole.MEMBER,
        default=EUserRole.MEMBER,
        nullable=False,
    )

    cards: Mapped[list["Card"]] = relationship("Card", back_populates="user")
    refresh_tokens: Mapped[list["RefreshToken"]] = relationship(
        "RefreshToken", back_populates="user"
    )
    password_recovery_codes: Mapped[list["PasswordRecoveryCode"]] = relationship(
        "PasswordRecoveryCode", back_populates="user"
    )
    role: Mapped["UserRole"] = relationship("UserRole", back_populates="users")
