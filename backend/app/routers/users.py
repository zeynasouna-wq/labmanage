from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.models import User
from app.core.dependencies import get_current_user, require_admin
from app.schemas.schemas import UserCreate, UserUpdate, UserResponse, UserPasswordChange
from app.services import user_service

router = APIRouter(prefix="/users", tags=["Utilisateurs"])


@router.get("/", response_model=list[UserResponse], summary="Lister les utilisateurs")
def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    return user_service.get_users(db, skip=skip, limit=limit)


@router.post("/", response_model=UserResponse, status_code=201, summary="Créer un utilisateur")
def create_user(
    data: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Seul un admin peut créer des comptes."""
    return user_service.create_user(db, data, created_by=current_user)


@router.get("/{user_id}", response_model=UserResponse, summary="Détail utilisateur")
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Users can view their own profile; admins can view any
    from app.models.models import UserRole
    if current_user.role != UserRole.admin and current_user.id != user_id:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Accès refusé")
    return user_service.get_user_by_id(db, user_id)


@router.patch("/{user_id}", response_model=UserResponse, summary="Modifier un utilisateur")
def update_user(
    user_id: int,
    data: UserUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    return user_service.update_user(db, user_id, data)


@router.delete("/{user_id}", status_code=204, summary="Désactiver un utilisateur")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    user_service.delete_user(db, user_id, current_user)


@router.post("/me/change-password", status_code=204, summary="Changer son mot de passe")
def change_password(
    data: UserPasswordChange,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user_service.change_password(db, current_user, data)