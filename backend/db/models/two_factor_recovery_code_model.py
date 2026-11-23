from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.helpers.now import now

from .base_model import BaseModel

if TYPE_CHECKING:
    from .user_model import UserModel


class TwoFactorRecoveryCodeModel(BaseModel):
    """One-time backup codes. Only the keyed HMAC is stored."""

    __tablename__ = "two_factor_recovery_codes"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, nullable=False)
    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", name="fk_two_factor_recovery_codes_user_id_users"),
        index=True,
        nullable=False,
    )
    code_hash: Mapped[str] = mapped_column(String(80), index=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=text("CURRENT_TIMESTAMP"),
        default=now,
        nullable=False,
    )
    used_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    user: Mapped["UserModel"] = relationship(
        "UserModel", back_populates="two_factor_recovery_codes"
    )
