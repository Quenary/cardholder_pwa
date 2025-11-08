from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from backend.db.session import get_async_session
from backend.db.models.user_model import UserModel
from backend.core.auth_core import (
    allow_registration,
    is_creds_taken,
    get_password_hash,
    is_user,
)
from backend.schemas.user_schema import (
    UserSchema,
    UserCreateSchema,
    UserUpdateSchema,
)
from backend.core.user_core import delete_user as _delete_user
from sqlalchemy import select
from backend.helpers.delay_to_minimum import delay_to_minimum
from backend.enums.user_role_enum import EUserRole

router = APIRouter(tags=["user"])


@router.post("/user", response_model=UserSchema, status_code=201)
@delay_to_minimum(1)
async def create_user(
    user: UserCreateSchema,
    session: AsyncSession = Depends(get_async_session),
    _=Depends(allow_registration),
):
    creds_taken = await is_creds_taken(
        session, user.username, user.email, None
    )
    if creds_taken:
        raise HTTPException(400, "Username or email is already taken")

    stmt = select(UserModel).limit(1)
    result = await session.execute(stmt)
    is_first = result.scalar_one_or_none() is None

    new_user = UserModel(
        username=user.username,
        email=user.email,
        hashed_password=get_password_hash(user.password),
    )
    if is_first:
        new_user.role_code = EUserRole.OWNER
    session.add(new_user)
    await session.commit()
    await session.refresh(new_user)
    return new_user


@router.get("/user", response_model=UserSchema)
async def get_user(current_user=Depends(is_user)):
    return current_user


@router.put("/user", response_model=UserSchema)
async def update_user(
    data: UserUpdateSchema,
    session: AsyncSession = Depends(get_async_session),
    current_user: UserModel = Depends(is_user),
):
    creds_taken = await is_creds_taken(
        session, data.username, data.email, current_user.id
    )
    if creds_taken:
        raise HTTPException(
            400, detail="Username or email is already taken"
        )
    if data.username != current_user.username:
        current_user.username = data.username
    if data.email != current_user.email:
        current_user.email = data.email
    if data.password:
        current_user.hashed_password = get_password_hash(
            data.password
        )
    await session.commit()
    await session.refresh(current_user)
    return current_user


@router.delete("/user")
async def delete_user(
    session: AsyncSession = Depends(get_async_session),
    current_user: UserModel = Depends(is_user),
):
    return await _delete_user(session, current_user)
