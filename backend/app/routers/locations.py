from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.models import User, Location
from app.core.dependencies import get_current_user, require_technician_or_admin, require_admin
from app.schemas.schemas import LocationCreate, LocationUpdate, LocationResponse

router = APIRouter(prefix="/locations", tags=["Localisations"])


@router.get("/", response_model=list[LocationResponse], summary="Lister les localisations")
def list_locations(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=500),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Lister toutes les localisations"""
    locations = db.query(Location).offset(skip).limit(limit).all()
    return locations


@router.post("/", response_model=LocationResponse, status_code=201, summary="Créer une localisation")
def create_location(
    data: LocationCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_technician_or_admin),
):
    """Créer une nouvelle localisation"""
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
    _: User = Depends(get_current_user),
):
    """Récupérer les détails d'une localisation"""
    location = db.query(Location).filter(Location.id == location_id).first()
    if not location:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Localisation non trouvée")
    return location


@router.patch("/{location_id}", response_model=LocationResponse, summary="Modifier une localisation")
def update_location(
    location_id: int,
    data: LocationUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_technician_or_admin),
):
    """Modifier une localisation"""
    location = db.query(Location).filter(Location.id == location_id).first()
    if not location:
        from fastapi import HTTPException
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
    _: User = Depends(require_admin),
):
    """Supprimer une localisation"""
    location = db.query(Location).filter(Location.id == location_id).first()
    if not location:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Localisation non trouvée")
    
    db.delete(location)
    db.commit()
