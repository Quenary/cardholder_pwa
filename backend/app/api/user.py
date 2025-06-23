from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
import app.db.models as models, app.db as db, app.schemas as schemas, app.core.auth as auth, app.enums as enums
from app.core.user import delete_user as _delete_user
from sqlalchemy import select
from app.helpers import delay_to_minimum

router = APIRouter(tags=["user"])


@router.post("/user", response_model=schemas.User)
@delay_to_minimum(1)
async def create_user(
    user: schemas.UserCreate,
    session: AsyncSession = Depends(db.get_async_session),
    _=Depends(auth.allow_registration),
):
    creds_taken = await auth.is_creds_taken(session, user.username, user.email, None)
    if creds_taken:
        raise HTTPException(400, "Username or email is already registered")

    stmt = select(models.User).limit(1)
    result = await session.execute(stmt)
    is_first = result.scalar_one_or_none() is None

    new_user = models.User(
        username=user.username,
        email=user.email,
        hashed_password=auth.get_password_hash(user.password),
    )
    if is_first:
        new_user.role_code = enums.EUserRole.OWNER
    session.add(new_user)
    await session.commit()
    await session.refresh(new_user)
    return new_user


@router.get("/user", response_model=schemas.User)
async def get_user(current_user=Depends(auth.is_user)):
    return current_user


@router.put("/user", response_model=schemas.User)
async def update_user(
    data: schemas.UserUpdate,
    session: AsyncSession = Depends(db.get_async_session),
    current_user: models.User = Depends(auth.is_user),
):
    creds_taken = await auth.is_creds_taken(
        session, data.username, data.email, current_user.id
    )
    if creds_taken:
        raise HTTPException(400, detail="Username or email is already taken")
    if data.username != current_user.username:
        current_user.username = data.username
    if data.email != current_user.email:
        current_user.email = data.email
    if data.password:
        current_user.hashed_password = auth.get_password_hash(data.password)
    await session.commit()
    await session.refresh(current_user)
    return current_user


@router.delete("/user")
async def delete_user(
    session: AsyncSession = Depends(db.get_async_session),
    current_user: models.User = Depends(auth.is_user),
):
    return await _delete_user(session, current_user)
