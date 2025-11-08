from .base_model import BaseModel
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import TYPE_CHECKING
from backend.enums.user_role_enum import EUserRole


if TYPE_CHECKING:
    from .user_model import UserModel


class UserRoleModel(BaseModel):
    __tablename__ = "user_roles"
    code: Mapped[EUserRole] = mapped_column(
        SQLEnum(EUserRole, native_enum=False),
        primary_key=True,
        nullable=False,
    )

    users: Mapped[list["UserModel"]] = relationship(
        "UserModel", back_populates="role"
    )
