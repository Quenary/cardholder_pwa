from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from backend.schemas.card_schema import (
    CardSchema,
    CardCreateSchema,
    CardUpdateSchema,
    CardPatchSchema,
)
from backend.db.models.user_model import UserModel
from backend.db.models.card_model import CardModel
from backend.db.session import get_async_session
from backend.core.auth_core import is_user
from sqlalchemy import select

router = APIRouter(tags=["card"])


@router.get("/cards", response_model=list[CardSchema])
async def get_cards(
    session: AsyncSession = Depends(get_async_session),
    user: UserModel = Depends(is_user),
):
    stmt = select(CardModel).where(CardModel.user_id == user.id)
    result = await session.execute(stmt)
    return result.scalars().all()


@router.get("/cards/{card_id}", response_model=CardSchema)
async def get_card(
    card_id: int,
    session: AsyncSession = Depends(get_async_session),
    user: UserModel = Depends(is_user),
):
    stmt = (
        select(CardModel)
        .where(CardModel.id == card_id, CardModel.user_id == user.id)
        .limit(1)
    )
    result = await session.execute(stmt)
    card = result.scalar_one_or_none()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    return card


@router.post("/cards", response_model=CardSchema, status_code=201)
async def create_card(
    card: CardCreateSchema,
    session: AsyncSession = Depends(get_async_session),
    user: UserModel = Depends(is_user),
):
    new_card = CardModel(**card.model_dump(), user_id=user.id)
    session.add(new_card)
    await session.commit()
    await session.refresh(new_card)
    return new_card


@router.put("/cards/{card_id}", response_model=CardSchema)
async def update_card(
    card_id: int,
    updated: CardUpdateSchema,
    session: AsyncSession = Depends(get_async_session),
    user: UserModel = Depends(is_user),
):
    stmt = (
        select(CardModel)
        .where(CardModel.id == card_id, CardModel.user_id == user.id)
        .limit(1)
    )
    result = await session.execute(stmt)
    card = result.scalar_one_or_none()

    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    for key, value in updated.model_dump(exclude_unset=True).items():
        if getattr(card, key) != value:
            setattr(card, key, value)
    await session.commit()
    await session.refresh(card)
    return card


@router.delete("/cards/{card_id}")
async def delete_card(
    card_id: int,
    session: AsyncSession = Depends(get_async_session),
    user: UserModel = Depends(is_user),
):
    stmt = (
        select(CardModel)
        .where(CardModel.id == card_id, CardModel.user_id == user.id)
        .limit(1)
    )
    result = await session.execute(stmt)
    card = result.scalar_one_or_none()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    await session.delete(card)
    await session.commit()
    return {"detail": "Card deleted"}


@router.patch("/cards/{card_id}")
async def patch_card(
    card_id: int,
    body: CardPatchSchema,
    session: AsyncSession = Depends(get_async_session),
    user: UserModel = Depends(is_user),
):
    stmt = (
        select(CardModel)
        .where(CardModel.id == card_id, CardModel.user_id == user.id)
        .limit(1)
    )
    result = await session.execute(stmt)
    card = result.scalar_one_or_none()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    for key, value in body.model_dump(exclude_unset=True).items():
        if getattr(card, key) != value:
            setattr(card, key, value)
    await session.commit()
    await session.refresh(card)
    return card
