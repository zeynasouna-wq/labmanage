from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.models.models import Location
from app.modules.locations import repository
from app.modules.locations.schemas import LocationCreate, LocationUpdate


def get_locations(db: Session, skip: int = 0, limit: int = 10000) -> list[Location]:
    return repository.list_locations(db, skip=skip, limit=limit)


def get_location(db: Session, location_id: int) -> Location:
    location = repository.get_by_id(db, location_id)
    if not location:
        raise NotFoundError("Localisation non trouvée")
    return location


def create_location(db: Session, data: LocationCreate) -> Location:
    location = Location(
        name=data.name,
        description=data.description,
        temperature_controlled=data.temperature_controlled,
    )
    return repository.create(db, location)


def update_location(db: Session, location_id: int, data: LocationUpdate) -> Location:
    location = get_location(db, location_id)

    if data.name is not None:
        location.name = data.name
    if data.description is not None:
        location.description = data.description
    if data.temperature_controlled is not None:
        location.temperature_controlled = data.temperature_controlled

    return repository.save(db, location)


def delete_location(db: Session, location_id: int) -> None:
    location = get_location(db, location_id)
    repository.delete(db, location)
