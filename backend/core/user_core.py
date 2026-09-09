from fastapi import HTTPException
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.models.card_model import CardModel
from backend.db.models.password_recovery_code_model import (
    PasswordRecoveryCodeModel,
)
from backend.db.models.refresh_token_model import RefreshTokenModel
from backend.db.models.user_model import UserModel
from backend.enums.user_role_enum import EUserRole
from backend.helpers.logo_storage import delete_logo


async def delete_user(
    db: AsyncSession,
    user: UserModel,
):
    if user.role_code == EUserRole.OWNER:
        raise HTTPException(403, "Owner cannot be deleted")

    # Read the file names while the rows are still there. The cards go in a
    # bulk delete, which hands nothing back, and once they are gone nothing
    # points at the images any more.
    result = await db.execute(
        select(CardModel.logo_file).where(
            CardModel.user_id == user.id,
            CardModel.logo_file.is_not(None),
        )
    )
    orphan_logos = list(result.scalars().all())

    await db.execute(delete(CardModel).where(CardModel.user_id == user.id))
    await db.execute(
        delete(RefreshTokenModel).where(RefreshTokenModel.user_id == user.id)
    )
    await db.execute(
        delete(PasswordRecoveryCodeModel).where(
            PasswordRecoveryCodeModel.user_id == user.id
        )
    )
    await db.delete(user)
    await db.commit()

    # Same order as deleting a single card: the files go once the rows that
    # referenced them are safely committed.
    for file_name in orphan_logos:
        delete_logo(file_name)

    return {"detail": "User and all related data deleted"}
