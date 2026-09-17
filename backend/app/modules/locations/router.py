from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.core.permissions import PermissionChecker, PermissionDenied
from app.db.session import get_db
from app.models.models import User
from app.modules.locations import service
from app.modules.locations.schemas import (
    LocationCreate,
    LocationResponse,
    LocationUpdate,
)

router = APIRouter(prefix="/locations", tags=["Localisations"])


@router.get(
    "/", response_model=list[LocationResponse], summary="Lister les localisations"
)
def list_locations(
    skip: int = Query(0, ge=0),
    limit: int = Query(10000, le=50000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lister toutes les localisations - accès pour tous"""
    if not PermissionChecker.can_list_locations(current_user):
        raise PermissionDenied("Accès refusé")

    return service.get_locations(db, skip=skip, limit=limit)


@router.post(
    "/",
    response_model=LocationResponse,
    status_code=201,
    summary="Créer une localisation",
)
def create_location(
    data: LocationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Créer une nouvelle localisation - UNIQUEMENT admin"""
    if not PermissionChecker.can_create_location(current_user):
        raise PermissionDenied("Seul un administrateur peut créer des localisations")

    return service.create_location(db, data)


@router.get(
    "/{location_id}", response_model=LocationResponse, summary="Détail localisation"
)
def get_location(
    location_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Récupérer les détails d'une localisation - accès pour tous"""
    if not PermissionChecker.can_view_location(current_user):
        raise PermissionDenied("Accès refusé")

    return service.get_location(db, location_id)


@router.patch(
    "/{location_id}",
    response_model=LocationResponse,
    summary="Modifier une localisation",
)
def update_location(
    location_id: int,
    data: LocationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Modifier une localisation - UNIQUEMENT admin"""
    if not PermissionChecker.can_update_location(current_user):
        raise PermissionDenied("Seul un administrateur peut modifier les localisations")

    return service.update_location(db, location_id, data)


@router.delete("/{location_id}", status_code=204, summary="Supprimer une localisation")
def delete_location(
    location_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Supprimer une localisation - Techniciens et admins"""
    if not PermissionChecker.can_delete_location(current_user):
        raise PermissionDenied(
            "Seuls les techniciens et administrateurs peuvent supprimer les localisations"
        )

    service.delete_location(db, location_id)
