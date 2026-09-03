from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, UniqueConstraint, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.helpers.now import now

from .base_model import BaseModel

if TYPE_CHECKING:
    from .card_model import CardModel
    from .user_model import UserModel


class CardShareModel(BaseModel):
    __tablename__ = "card_shares"
    __table_args__ = (
        UniqueConstraint(
            "card_id", "shared_with_user_id", name="uq_card_shares_card_user"
        ),
    )

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, index=True, nullable=False
    )
    card_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("cards.id", ondelete="CASCADE"), nullable=False, index=True
    )
    owner_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    shared_with_user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=text("CURRENT_TIMESTAMP"), default=now, nullable=False
    )

    card: Mapped["CardModel"] = relationship("CardModel", back_populates="shares")
    owner: Mapped["UserModel"] = relationship(
        "UserModel", foreign_keys=[owner_id], back_populates="shared_cards"
    )
    shared_with_user: Mapped["UserModel"] = relationship(
        "UserModel",
        foreign_keys=[shared_with_user_id],
        back_populates="cards_shared_with_me",
    )
