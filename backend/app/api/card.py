from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import app.db as db, app.db.models as models, app.schemas as schemas, app.core.auth as auth

router = APIRouter(tags=["card"])


@router.get("/cards", response_model=list[schemas.Card])
def get_cards(
    db: Session = Depends(db.get_db),
    user: models.User = Depends(auth.is_user),
):
    return db.query(models.Card).filter(models.Card.user_id == user.id).all()


@router.get("/cards/{card_id}", response_model=schemas.Card)
def get_card(
    card_id: int,
    db: Session = Depends(db.get_db),
    user=Depends(auth.is_user),
):
    card = db.query(models.Card).filter_by(id=card_id, user_id=user.id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    return card


@router.post("/cards", response_model=schemas.Card)
def create_card(
    card: schemas.CardCreate,
    db: Session = Depends(db.get_db),
    user=Depends(auth.is_user),
):
    new_card = models.Card(**card.dict(), user_id=user.id)
    db.add(new_card)
    db.commit()
    db.refresh(new_card)
    return new_card


@router.put("/cards/{card_id}", response_model=schemas.Card)
def update_card(
    card_id: int,
    updated: schemas.CardCreate,
    db: Session = Depends(db.get_db),
    user=Depends(auth.is_user),
):
    card = db.query(models.Card).filter_by(id=card_id, user_id=user.id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    for key, value in updated.dict().items():
        setattr(card, key, value)
    db.commit()
    db.refresh(card)
    return card


@router.delete("/cards/{card_id}")
def delete_card(
    card_id: int,
    db: Session = Depends(db.get_db),
    user=Depends(auth.is_user),
):
    card = db.query(models.Card).filter_by(id=card_id, user_id=user.id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    db.delete(card)
    db.commit()
    return {"detail": "Card deleted"}
