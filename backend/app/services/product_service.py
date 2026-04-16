from typing import Optional, List
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_
from fastapi import HTTPException
from app.models.models import Product, ProductLot, Supplier, Location, Category
from app.schemas.schemas import ProductCreate, ProductUpdate, ProductLotCreate


def get_products(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    supplier_id: Optional[int] = None,
    location_id: Optional[int] = None,
    category_id: Optional[int] = None,
    is_active: Optional[bool] = True,
) -> tuple[List[Product], int]:
    query = db.query(Product).options(
        joinedload(Product.supplier),
        joinedload(Product.location),
        joinedload(Product.category),
        joinedload(Product.lots),
    )

    if is_active is not None:
        query = query.filter(Product.is_active == is_active)
    if search:
        query = query.filter(
            or_(
                Product.name.ilike(f"%{search}%"),
                Product.reference.ilike(f"%{search}%"),
                Product.lot_number.ilike(f"%{search}%"),
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


def get_product(db: Session, product_id: int) -> Product:
    product = db.query(Product).options(
        joinedload(Product.supplier),
        joinedload(Product.location),
        joinedload(Product.category),
        joinedload(Product.lots),
    ).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produit introuvable")
    return product


def create_product(db: Session, data: ProductCreate) -> Product:
    # Validate foreign keys
    if data.supplier_id and not db.query(Supplier).filter(Supplier.id == data.supplier_id).first():
        raise HTTPException(status_code=404, detail="Fournisseur introuvable")
    if data.location_id and not db.query(Location).filter(Location.id == data.location_id).first():
        raise HTTPException(status_code=404, detail="Emplacement introuvable")
    if data.category_id and not db.query(Category).filter(Category.id == data.category_id).first():
        raise HTTPException(status_code=404, detail="Catégorie introuvable")

    product = Product(**data.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


def update_product(db: Session, product_id: int, data: ProductUpdate) -> Product:
    product = get_product(db, product_id)
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(product, field, value)
    db.commit()
    db.refresh(product)
    return product


def delete_product(db: Session, product_id: int):
    product = get_product(db, product_id)
    product.is_active = False
    db.commit()


def add_lot(db: Session, product_id: int, data: ProductLotCreate) -> ProductLot:
    get_product(db, product_id)  # validate existence
    lot = ProductLot(product_id=product_id, **data.model_dump())
    db.add(lot)
    db.commit()
    db.refresh(lot)
    return lot


def get_lots(db: Session, product_id: int) -> List[ProductLot]:
    return db.query(ProductLot).filter(ProductLot.product_id == product_id).all()