from .base_model import BaseModel
from sqlalchemy import Integer, String, Boolean, DateTime, ForeignKey, text
from sqlalchemy.orm import relationship, mapped_column, Mapped
from datetime import datetime
from typing import TYPE_CHECKING, Optional
from backend.helpers.now import now

if TYPE_CHECKING:
    from .user_model import UserModel


class RefreshTokenModel(BaseModel):
    __tablename__ = "refresh_tokens"
    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, index=True, nullable=False
    )
    token: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
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
    user_agent: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    user: Mapped["UserModel"] = relationship("UserModel", back_populates="refresh_tokens")
