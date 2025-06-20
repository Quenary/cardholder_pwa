from sqlalchemy.orm import Session
from fastapi import HTTPException
import app.db.models as models
import app.enums as enums


def delete_user(
    db: Session,
    user: models.User,
):
    if user.role_code == enums.EUserRole.OWNER:
        raise HTTPException(403, "Owner cannot be deleted")

    db.query(models.Card).filter_by(user_id=user.id).delete()
    db.query(models.RefreshToken).filter_by(user_id=user.id).delete()
    db.query(models.PasswordRecoveryCode).filter_by(user_id=user.id).delete()
    db.delete(user)
    db.commit()
    return {"detail": "User and all related data deleted"}
