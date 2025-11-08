from .base_model import BaseModel
from sqlalchemy import Integer, String, Boolean, DateTime, ForeignKey, text
from sqlalchemy.orm import relationship, mapped_column, Mapped
from datetime import datetime
from typing import TYPE_CHECKING
from backend.helpers.now import now

if TYPE_CHECKING:
    from .user_model import UserModel


class PasswordRecoveryCodeModel(BaseModel):
    """Model of table with password recovery codes"""

    __tablename__ = "password_recovery_codes"
    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, index=True, nullable=False
    )
    code: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=text("CURRENT_TIMESTAMP"), default=now, nullable=False
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    revoked: Mapped[bool] = mapped_column(
        Boolean, server_default=text("FALSE"), default=False, nullable=False
    )

    user: Mapped["UserModel"] = relationship(
        "UserModel", back_populates="password_recovery_codes"
    )
