from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.models import User, Location
from app.core.dependencies import get_current_user, require_admin
from app.core.permissions import PermissionChecker, PermissionDenied
from app.schemas.schemas import LocationCreate, LocationUpdate, LocationResponse

router = APIRouter(prefix="/locations", tags=["Localisations"])


@router.get("/", response_model=list[LocationResponse], summary="Lister les localisations")
def list_locations(
    skip: int = Query(0, ge=0),
    limit: int = Query(10000, le=50000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lister toutes les localisations - accès pour tous"""
    if not PermissionChecker.can_list_locations(current_user):
        raise PermissionDenied("Accès refusé")
    
    locations = db.query(Location).offset(skip).limit(limit).all()
    return locations


@router.post("/", response_model=LocationResponse, status_code=201, summary="Créer une localisation")
def create_location(
    data: LocationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Créer une nouvelle localisation - UNIQUEMENT admin"""
    if not PermissionChecker.can_create_location(current_user):
        raise PermissionDenied("Seul un administrateur peut créer des localisations")
    
    location = Location(
        name=data.name,
        description=data.description,
        temperature_controlled=data.temperature_controlled,
    )
    db.add(location)
    db.commit()
    db.refresh(location)
    return location


@router.get("/{location_id}", response_model=LocationResponse, summary="Détail localisation")
def get_location(
    location_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Récupérer les détails d'une localisation - accès pour tous"""
    if not PermissionChecker.can_view_location(current_user):
        raise PermissionDenied("Accès refusé")
    
    location = db.query(Location).filter(Location.id == location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Localisation non trouvée")
    return location


@router.patch("/{location_id}", response_model=LocationResponse, summary="Modifier une localisation")
def update_location(
    location_id: int,
    data: LocationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Modifier une localisation - UNIQUEMENT admin"""
    if not PermissionChecker.can_update_location(current_user):
        raise PermissionDenied("Seul un administrateur peut modifier les localisations")
    
    location = db.query(Location).filter(Location.id == location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Localisation non trouvée")
    
    if data.name is not None:
        location.name = data.name
    if data.description is not None:
        location.description = data.description
    if data.temperature_controlled is not None:
        location.temperature_controlled = data.temperature_controlled
    
    db.commit()
    db.refresh(location)
    return location


@router.delete("/{location_id}", status_code=204, summary="Supprimer une localisation")
def delete_location(
    location_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Supprimer une localisation - Techniciens et admins"""
    if not PermissionChecker.can_delete_location(current_user):
        raise PermissionDenied("Seuls les techniciens et administrateurs peuvent supprimer les localisations")
    
    location = db.query(Location).filter(Location.id == location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Localisation non trouvée")
    
    db.delete(location)
    db.commit()
