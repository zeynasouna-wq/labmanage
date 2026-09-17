from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.models import Supplier


def get_by_id(db: Session, supplier_id: int) -> Supplier | None:
    return db.query(Supplier).filter(Supplier.id == supplier_id).first()


def get_by_name(db: Session, name: str) -> Supplier | None:
    return db.query(Supplier).filter(Supplier.name == name).first()


def list_suppliers(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    search: str | None = None,
) -> tuple[list[Supplier], int]:
    query = db.query(Supplier)

    if search:
        query = query.filter(
            or_(
                Supplier.name.ilike(f"%{search}%"),
                Supplier.contact.ilike(f"%{search}%"),
                Supplier.email.ilike(f"%{search}%"),
            )
        )

    total = query.count()
    items = query.order_by(Supplier.name).offset(skip).limit(limit).all()
    return items, total


def create(db: Session, supplier: Supplier) -> Supplier:
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    return supplier


def save(db: Session, supplier: Supplier) -> Supplier:
    db.commit()
    db.refresh(supplier)
    return supplier


def delete(db: Session, supplier: Supplier) -> None:
    db.delete(supplier)
    db.commit()
