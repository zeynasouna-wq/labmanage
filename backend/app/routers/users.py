from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.models import User, UserRole
from app.core.dependencies import get_current_user, require_admin
from app.core.permissions import PermissionChecker, PermissionDenied
from app.schemas.schemas import UserCreate, UserUpdate, UserResponse, UserPasswordChange
from app.services import user_service

router = APIRouter(prefix="/users", tags=["Utilisateurs"])


@router.get("/", response_model=list[UserResponse], summary="Lister les utilisateurs")
def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(1000, le=10000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # ✗ UNIQUEMENT admin peut lister les utilisateurs
    if not PermissionChecker.can_list_users(current_user):
        raise PermissionDenied("Seul un administrateur peut lister les utilisateurs")
    
    return user_service.get_users(db, skip=skip, limit=limit)


@router.post("/", response_model=UserResponse, status_code=201, summary="Créer un utilisateur")
def create_user(
    data: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # ✗ UNIQUEMENT admin peut créer des utilisateurs
    if not PermissionChecker.can_create_user(current_user):
        raise PermissionDenied("Seul un administrateur peut créer des utilisateurs")
    
    return user_service.create_user(db, data, created_by=current_user)


@router.get("/{user_id}", response_model=UserResponse, summary="Détail utilisateur")
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # ✗ Admins peuvent voir n'importe quel utilisateur, autres peuvent voir leur profil
    if not PermissionChecker.can_view_user(current_user, user_id):
        raise PermissionDenied("Vous ne pouvez consulter que votre propre profil")
    
    return user_service.get_user_by_id(db, user_id)


@router.patch("/{user_id}", response_model=UserResponse, summary="Modifier un utilisateur")
def update_user(
    user_id: int,
    data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # ✗ UNIQUEMENT admin peut modifier les utilisateurs
    if not PermissionChecker.can_update_user(current_user):
        raise PermissionDenied("Seul un administrateur peut modifier les utilisateurs")
    
    return user_service.update_user(db, user_id, data)


@router.delete("/{user_id}", status_code=204, summary="Désactiver un utilisateur")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # ✗ UNIQUEMENT admin peut supprimer des utilisateurs
    if not PermissionChecker.can_delete_user(current_user):
        raise PermissionDenied("Seul un administrateur peut désactiver des utilisateurs")
    
    user_service.delete_user(db, user_id, current_user)


@router.post("/{user_id}/toggle-status", response_model=UserResponse, summary="Activer/Désactiver un utilisateur")
def toggle_user_status(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # ✗ UNIQUEMENT admin peut changer le statut des utilisateurs
    if not PermissionChecker.can_update_user(current_user):
        raise PermissionDenied("Seul un administrateur peut modifier les utilisateurs")
    
    return user_service.toggle_user_status(db, user_id, current_user)


@router.post("/me/change-password", status_code=204, summary="Changer son mot de passe")
def change_password(
    data: UserPasswordChange,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # ✓ Tous les utilisateurs authentifiés peuvent changer leur mot de passe
    user_service.change_password(db, current_user, data)