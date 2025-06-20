from .base import Base
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import TYPE_CHECKING
from app.enums import EUserRole


if TYPE_CHECKING:
    from .user import User


class UserRole(Base):
    __tablename__ = "user_roles"
    code: Mapped[EUserRole] = mapped_column(
        SQLEnum(EUserRole, native_enum=False), primary_key=True, nullable=False
    )

    users: Mapped[list["User"]] = relationship("User", back_populates="role")
