from sqlalchemy.orm import Session

from app.models.models import Location


def get_by_id(db: Session, location_id: int) -> Location | None:
    return db.query(Location).filter(Location.id == location_id).first()


def list_locations(db: Session, skip: int = 0, limit: int = 10000) -> list[Location]:
    return db.query(Location).offset(skip).limit(limit).all()


def create(db: Session, location: Location) -> Location:
    db.add(location)
    db.commit()
    db.refresh(location)
    return location


def save(db: Session, location: Location) -> Location:
    db.commit()
    db.refresh(location)
    return location


def delete(db: Session, location: Location) -> None:
    db.delete(location)
    db.commit()
