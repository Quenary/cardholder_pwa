from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import delete
from fastapi import HTTPException
from backend.db.models import User, Card, RefreshToken, PasswordRecoveryCode
import backend.enums as enums


async def delete_user(
    db: AsyncSession,
    user: User,
):
    if user.role_code == enums.EUserRole.OWNER:
        raise HTTPException(403, "Owner cannot be deleted")
    await db.execute(delete(Card).where(Card.user_id == user.id))
    await db.execute(delete(RefreshToken).where(RefreshToken.user_id == user.id))
    await db.execute(
        delete(PasswordRecoveryCode).where(PasswordRecoveryCode.user_id == user.id)
    )
    await db.delete(user)
    await db.commit()
    return {"detail": "User and all related data deleted"}
