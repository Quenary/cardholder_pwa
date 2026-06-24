from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Integer,
    String,
    text,
)
from sqlalchemy import (
    Enum as SQLEnum,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.enums.user_role_enum import EUserRole
from backend.helpers.now import now

from .base_model import BaseModel

if TYPE_CHECKING:
    from .card_model import CardModel
    from .password_recovery_code_model import (
        PasswordRecoveryCodeModel,
    )
    from .refresh_token_model import RefreshTokenModel
    from .user_role_model import UserRoleModel


class UserModel(BaseModel):
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
        DateTime,
        server_default=text("CURRENT_TIMESTAMP"),
        default=now,
        nullable=False,
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

    cards: Mapped[list["CardModel"]] = relationship("CardModel", back_populates="user")
    refresh_tokens: Mapped[list["RefreshTokenModel"]] = relationship(
        "RefreshTokenModel", back_populates="user"
    )
    password_recovery_codes: Mapped[list["PasswordRecoveryCodeModel"]] = relationship(
        "PasswordRecoveryCodeModel", back_populates="user"
    )
    role: Mapped["UserRoleModel"] = relationship(
        "UserRoleModel", back_populates="users"
    )
