from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from app.models.models import Product, ProductLot


def _with_relations(query):
    return query.options(
        joinedload(Product.supplier),
        joinedload(Product.location),
        joinedload(Product.category),
        joinedload(Product.lots),
    )


def list_products(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    search: str | None = None,
    supplier_id: int | None = None,
    location_id: int | None = None,
    category_id: int | None = None,
    is_active: bool | None = True,
) -> tuple[list[Product], int]:
    query = _with_relations(db.query(Product))

    if is_active is not None:
        query = query.filter(Product.is_active == is_active)
    if search:
        query = query.filter(
            or_(
                Product.name.ilike(f"%{search}%"),
                Product.reference.ilike(f"%{search}%"),
            )
        )
    if supplier_id:
        query = query.filter(Product.supplier_id == supplier_id)
    if location_id:
        query = query.filter(Product.location_id == location_id)
    if category_id:
        query = query.filter(Product.category_id == category_id)

    total = query.count()
    items = query.order_by(Product.name).offset(skip).limit(limit).all()
    return items, total


def get_by_id(db: Session, product_id: int) -> Product | None:
    return _with_relations(db.query(Product)).filter(Product.id == product_id).first()


def get_by_reference(
    db: Session, reference: str, exclude_id: int | None = None
) -> Product | None:
    query = db.query(Product).filter(Product.reference == reference)
    if exclude_id is not None:
        query = query.filter(Product.id != exclude_id)
    return query.first()


def create(db: Session, product: Product) -> Product:
    db.add(product)
    db.flush()
    return product


def save(db: Session, product: Product) -> Product:
    db.commit()
    db.refresh(product)
    return product


def refresh(db: Session, obj) -> None:
    db.refresh(obj)


def commit(db: Session) -> None:
    db.commit()


def delete(db: Session, product: Product) -> None:
    db.delete(product)
    db.commit()


def get_lots(db: Session, product_id: int) -> list[ProductLot]:
    return db.query(ProductLot).filter(ProductLot.product_id == product_id).all()


def get_lot_by_id(db: Session, product_id: int, lot_id: int) -> ProductLot | None:
    return (
        db.query(ProductLot)
        .filter(ProductLot.id == lot_id, ProductLot.product_id == product_id)
        .first()
    )


def create_lot(db: Session, lot: ProductLot) -> ProductLot:
    db.add(lot)
    db.flush()
    return lot


def delete_lot(db: Session, lot: ProductLot) -> None:
    db.delete(lot)
    db.flush()
