from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError, ValidationAppError
from app.core.security import get_password_hash, verify_password
from app.models.models import User, UserStatus
from app.modules.users import repository
from app.modules.users.schemas import UserCreate, UserPasswordChange, UserUpdate


def create_user(db: Session, data: UserCreate, created_by: User) -> User:
    if repository.get_by_email(db, data.email):
        raise ValidationAppError("Cet email est déjà utilisé")

    # Admin creates active users; self-registration would be pending
    user = User(
        name=data.name,
        email=data.email,
        hashed_password=get_password_hash(data.password),
        role=data.role,
        status=UserStatus.active,  # Admin-created users are immediately active
        created_by_id=created_by.id,
    )
    return repository.create(db, user)


def get_users(db: Session, skip: int = 0, limit: int = 100) -> list[User]:
    return repository.list_users(db, skip=skip, limit=limit)


def get_user_by_id(db: Session, user_id: int) -> User:
    user = repository.get_by_id(db, user_id)
    if not user:
        raise NotFoundError("Utilisateur introuvable")
    return user


def update_user(db: Session, user_id: int, data: UserUpdate) -> User:
    user = get_user_by_id(db, user_id)
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)
    return repository.save(db, user)


def delete_user(db: Session, user_id: int, current_user: User) -> None:
    if user_id == current_user.id:
        raise ValidationAppError("Vous ne pouvez pas supprimer votre propre compte")
    user = get_user_by_id(db, user_id)
    repository.delete(db, user)


def change_password(db: Session, user: User, data: UserPasswordChange) -> None:
    if not verify_password(data.current_password, user.hashed_password):
        raise ValidationAppError("Mot de passe actuel incorrect")
    user.hashed_password = get_password_hash(data.new_password)
    repository.save(db, user)


def toggle_user_status(db: Session, user_id: int, current_user: User) -> User:
    """Toggle user active status (enable/disable)"""
    if user_id == current_user.id:
        raise ValidationAppError("Vous ne pouvez pas modifier votre propre statut")

    user = get_user_by_id(db, user_id)
    user.is_active = not user.is_active

    # Update status enum if needed
    if user.is_active:
        user.status = UserStatus.active
    else:
        user.status = UserStatus.disabled

    return repository.save(db, user)
