from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
import app.db as db, app.db.models as models, app.schemas as schemas, app.core.auth as auth
from sqlalchemy import select

router = APIRouter(tags=["card"])


@router.get("/cards", response_model=list[schemas.Card])
async def get_cards(
    session: AsyncSession = Depends(db.get_async_session),
    user: models.User = Depends(auth.is_user),
):
    stmt = select(models.Card).where(models.Card.user_id == user.id)
    result = await session.execute(stmt)
    return result.scalars().all()


@router.get("/cards/{card_id}", response_model=schemas.Card)
async def get_card(
    card_id: int,
    session: AsyncSession = Depends(db.get_async_session),
    user: models.User = Depends(auth.is_user),
):
    stmt = (
        select(models.Card)
        .where(models.Card.id == card_id, models.Card.user_id == user.id)
        .limit(1)
    )
    result = await session.execute(stmt)
    card = result.scalar_one_or_none()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    return card


@router.post("/cards", response_model=schemas.Card, status_code=201)
async def create_card(
    card: schemas.CardCreate,
    session: AsyncSession = Depends(db.get_async_session),
    user: models.User = Depends(auth.is_user),
):
    new_card = models.Card(**card.model_dump(), user_id=user.id)
    session.add(new_card)
    await session.commit()
    await session.refresh(new_card)
    return new_card


@router.put("/cards/{card_id}", response_model=schemas.Card)
async def update_card(
    card_id: int,
    updated: schemas.CardCreate,
    session: AsyncSession = Depends(db.get_async_session),
    user: models.User = Depends(auth.is_user),
):
    stmt = (
        select(models.Card)
        .where(models.Card.id == card_id, models.Card.user_id == user.id)
        .limit(1)
    )
    result = await session.execute(stmt)
    card = result.scalar_one_or_none()

    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    for key, value in updated.model_dump().items():
        if getattr(card, key) != value:
            setattr(card, key, value)
    await session.commit()
    await session.refresh(card)
    return card


@router.delete("/cards/{card_id}")
async def delete_card(
    card_id: int,
    session: AsyncSession = Depends(db.get_async_session),
    user: models.User = Depends(auth.is_user),
):
    stmt = (
        select(models.Card)
        .where(models.Card.id == card_id, models.Card.user_id == user.id)
        .limit(1)
    )
    result = await session.execute(stmt)
    card = result.scalar_one_or_none()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    await session.delete(card)
    await session.commit()
    return {"detail": "Card deleted"}
