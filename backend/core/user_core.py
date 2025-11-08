from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import delete
from fastapi import HTTPException
from backend.db.models.user_model import UserModel
from backend.db.models.card_model import CardModel
from backend.db.models.refresh_token_model import RefreshTokenModel
from backend.db.models.password_recovery_code_model import (
    PasswordRecoveryCodeModel,
)
from backend.enums.user_role_enum import EUserRole


async def delete_user(
    db: AsyncSession,
    user: UserModel,
):
    if user.role_code == EUserRole.OWNER:
        raise HTTPException(403, "Owner cannot be deleted")
    await db.execute(
        delete(CardModel).where(CardModel.user_id == user.id)
    )
    await db.execute(
        delete(RefreshTokenModel).where(
            RefreshTokenModel.user_id == user.id
        )
    )
    await db.execute(
        delete(PasswordRecoveryCodeModel).where(
            PasswordRecoveryCodeModel.user_id == user.id
        )
    )
    await db.delete(user)
    await db.commit()
    return {"detail": "User and all related data deleted"}
