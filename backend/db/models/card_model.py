from backend.helpers.now import now
from .base_model import BaseModel
from sqlalchemy import Integer, String, Text, DateTime, ForeignKey, text, Boolean
from sqlalchemy.orm import relationship, mapped_column, Mapped
from sqlalchemy.sql import func
from datetime import datetime
from typing import TYPE_CHECKING, Optional

if TYPE_CHECKING:
    from .user_model import UserModel


class CardModel(BaseModel):
    __tablename__ = "cards"
    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, index=True, nullable=False
    )
    code: Mapped[str] = mapped_column(String, nullable=False)
    code_type: Mapped[str] = mapped_column(String, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[Optional[Text]] = mapped_column(Text, nullable=True)
    color: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    is_favorite: Mapped[bool] = mapped_column(
        Boolean, server_default=text("FALSE"), default=False, nullable=False
    )
    used_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False
    )
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

    user: Mapped["UserModel"] = relationship("UserModel", back_populates="cards")
