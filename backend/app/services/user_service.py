from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.models import User, UserRole, UserStatus
from app.core.security import get_password_hash, verify_password
from app.schemas.schemas import UserCreate, UserUpdate, UserPasswordChange


def create_user(db: Session, data: UserCreate, created_by: User) -> User:
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Cet email est déjà utilisé")

    # Admin creates active users; self-registration would be pending
    user = User(
        name=data.name,
        email=data.email,
        hashed_password=get_password_hash(data.password),
        role=data.role,
        status=UserStatus.active,  # Admin-created users are immediately active
        created_by_id=created_by.id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def get_users(db: Session, skip: int = 0, limit: int = 100):
    return db.query(User).offset(skip).limit(limit).all()


def get_user_by_id(db: Session, user_id: int) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    return user


def update_user(db: Session, user_id: int, data: UserUpdate) -> User:
    user = get_user_by_id(db, user_id)
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return user


def delete_user(db: Session, user_id: int, current_user: User):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas supprimer votre propre compte")
    user = get_user_by_id(db, user_id)
    db.delete(user)
    db.commit()


def change_password(db: Session, user: User, data: UserPasswordChange):
    if not verify_password(data.current_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Mot de passe actuel incorrect")
    user.hashed_password = get_password_hash(data.new_password)
    db.commit()


def toggle_user_status(db: Session, user_id: int, current_user: User) -> User:
    """Toggle user active status (enable/disable)"""
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas modifier votre propre statut")
    
    user = get_user_by_id(db, user_id)
    user.is_active = not user.is_active
    
    # Update status enum if needed
    if user.is_active:
        user.status = UserStatus.active
    else:
        user.status = UserStatus.disabled
    
    db.commit()
    db.refresh(user)
    return user