"""Unfiltered, unpaginated reads for full-data CSV export.

Deliberately not reusing the paginated list_* functions of the other
domains' repositories: those default to limit=100, which would silently
truncate exports. This module always fetches every row, matching the
original db.query(Model).all() calls in the pre-refactor service.
"""

from sqlalchemy.orm import Session

from app.models.models import (
    Alert,
    Category,
    Location,
    Product,
    ProductLot,
    StockMovement,
    Supplier,
    User,
)


def get_all_products(db: Session) -> list[Product]:
    return db.query(Product).all()


def get_all_movements(db: Session) -> list[StockMovement]:
    return db.query(StockMovement).order_by(StockMovement.created_at.desc()).all()


def get_all_alerts(db: Session) -> list[Alert]:
    return db.query(Alert).order_by(Alert.triggered_at.desc()).all()


def get_all_users(db: Session) -> list[User]:
    return db.query(User).all()


def get_all_suppliers(db: Session) -> list[Supplier]:
    return db.query(Supplier).all()


def get_all_locations(db: Session) -> list[Location]:
    return db.query(Location).all()


def get_all_categories(db: Session) -> list[Category]:
    return db.query(Category).all()


def get_all_product_lots(db: Session) -> list[ProductLot]:
    return db.query(ProductLot).order_by(ProductLot.received_at.desc()).all()
