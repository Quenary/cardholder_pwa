from .base import Base
from sqlalchemy import Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship, mapped_column, Mapped
from datetime import datetime
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .user import User


class PasswordRecoveryCode(Base):
    """Model of table with password recovery codes"""

    __tablename__ = "password_recovery_codes"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    code: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    expires_at: Mapped[datetime] = mapped_column(DateTime)
    revoked: Mapped[bool] = mapped_column(Boolean, default=False)
    user: Mapped["User"] = relationship("User", back_populates="password_recovery_codes")
