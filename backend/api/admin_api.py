from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.enums.user_role_enum import EUserRole
from backend.schemas.settings_schema import (
    GetSettingsRequestItemSchema,
    PatchSettingsRequestItemSchema,
)
from backend.schemas.user_schema import UserSchema
from backend.db.models.user_model import UserModel
from backend.db.models.settings_model import SettingModel
from backend.core.auth_core import is_user_admin, is_user_owner
from backend.db.session import get_async_session
from backend.core.user_core import delete_user
from backend.core.smtp_core import EmailSender
from backend.helpers.get_setting_typed_value import get_setting_typed_value


router = APIRouter(tags=["admin"], prefix="/admin")


@router.get("/users", response_model=list[UserSchema])
async def get_users_list(
    session: AsyncSession = Depends(get_async_session),
    _: UserModel = Depends(is_user_admin),
):
    stmt = select(UserModel)
    result = await session.execute(stmt)
    return result.scalars().all()


@router.delete("/users/{user_id}")
async def admin_delete_user(
    user_id: int,
    session: AsyncSession = Depends(get_async_session),
    admin: UserModel = Depends(is_user_admin),
):
    if user_id == admin.id:
        raise HTTPException(
            403,
            "Admin cannot delete his own account with this function.",
        )

    stmt = select(UserModel).where(UserModel.id == user_id).limit(1)
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(404, "User not found")

    if (
        admin.role_code == EUserRole.ADMIN
        and user.role_code == EUserRole.ADMIN
    ):
        raise HTTPException(403, "Admin cannot delete admin.")

    return await delete_user(session, user)


@router.put(
    "/users/role",
    description="Change the user role. Only owner can change roles.",
)
async def owner_change_user_role(
    user_id: int,
    role_code: EUserRole,
    session: AsyncSession = Depends(get_async_session),
    owner: UserModel = Depends(is_user_owner),
):
    owner_assign_error = HTTPException(
        403, "Owner role cannot be reassigned."
    )

    if role_code == EUserRole.OWNER:
        raise owner_assign_error

    if user_id == owner.id:
        raise owner_assign_error

    stmt = select(UserModel).where(UserModel.id == user_id).limit(1)
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(404, "User not found")

    user.role_code = role_code
    await session.commit()
    await session.refresh(user)
    return {"detail": "User role has been changed"}


@router.get(
    "/settings", response_model=list[GetSettingsRequestItemSchema]
)
async def get_system_settings(
    session: AsyncSession = Depends(get_async_session),
    _: UserModel = Depends(is_user_admin),
):
    stmt = select(SettingModel)
    result = await session.execute(stmt)
    settings = result.scalars()
    res = []
    for s in settings:
        val = get_setting_typed_value(s.value, s.value_type)
        res.append(
            {
                "key": s.key,
                "value": val,
                "value_type": s.value_type,
                "updated_at": s.updated_at.isoformat(),
            }
        )

    return res


@router.patch("/settings")
async def change_system_settings(
    request: list[PatchSettingsRequestItemSchema],
    session: AsyncSession = Depends(get_async_session),
    _: UserModel = Depends(is_user_admin),
):
    for s in request:
        stmt = (
            select(SettingModel)
            .where(SettingModel.key == s.key)
            .limit(1)
        )
        result = await session.execute(stmt)
        setting = result.scalar_one_or_none()
        if not setting:
            raise HTTPException(
                status_code=404, detail=f"Setting '{s.key}' not found"
            )
        if setting.value_type != type(s.value).__name__:
            raise HTTPException(
                400,
                f"Invalid type of '{s.key}', expected '{setting.value_type}'",
            )

        setting.value = str(s.value)

    await session.commit()
    return {"status": "updated", "count": len(request)}


@router.get("/smtp/status", response_model=bool)
async def get_smtp_status(
    _: UserModel = Depends(is_user_admin),
):
    return EmailSender.status()


@router.post("/smtp/test")
async def send_test_email(
    admin: UserModel = Depends(is_user_admin),
):
    EmailSender.send_email(
        admin.email,
        "Test email from Cardholder PWA",
        "This is body of the test email.\nGood day!\n",
    )
