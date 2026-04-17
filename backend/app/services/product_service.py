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
    # Validate uniqueness of reference
    existing = db.query(Product).filter(Product.reference == data.reference).first()
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"Un produit avec la référence '{data.reference}' existe déjà"
        )
    
    # Validate foreign keys
    if data.supplier_id and not db.query(Supplier).filter(Supplier.id == data.supplier_id).first():
        raise HTTPException(status_code=404, detail="Fournisseur introuvable")
    if data.location_id and not db.query(Location).filter(Location.id == data.location_id).first():
        raise HTTPException(status_code=404, detail="Emplacement introuvable")
    if data.category_id and not db.query(Category).filter(Category.id == data.category_id).first():
        raise HTTPException(status_code=404, detail="Catégorie introuvable")

    # Extract lots before creating product
    lots_data = data.lots or []
    
    # Create product without lots
    product_data = data.model_dump(exclude={"lots"})
    product = Product(**product_data)
    db.add(product)
    db.flush()  # Get the product ID without committing
    
    # Create lots
    for lot_data in lots_data:
        lot = ProductLot(product_id=product.id, **lot_data.model_dump())
        db.add(lot)
    
    db.commit()
    db.refresh(product)
    return product


def update_product(db: Session, product_id: int, data: ProductUpdate) -> Product:
    product = get_product(db, product_id)
    update_data = data.model_dump(exclude_unset=True)
    
    # If reference is being updated, check uniqueness
    if "reference" in update_data and update_data["reference"]:
        existing = db.query(Product).filter(
            Product.reference == update_data["reference"],
            Product.id != product_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=409,
                detail=f"Un produit avec la référence '{update_data['reference']}' existe déjà"
            )
    
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


def update_lot(db: Session, product_id: int, lot_id: int, data: ProductLotCreate) -> ProductLot:
    get_product(db, product_id)  # validate product exists
    lot = db.query(ProductLot).filter(
        ProductLot.id == lot_id, 
        ProductLot.product_id == product_id
    ).first()
    if not lot:
        raise HTTPException(status_code=404, detail="Lot introuvable")
    lot.lot_number = data.lot_number
    lot.quantity = data.quantity
    lot.expiry_date = data.expiry_date
    lot.notes = data.notes
    db.commit()
    db.refresh(lot)
    return lot


def delete_lot(db: Session, product_id: int, lot_id: int):
    get_product(db, product_id)  # validate product exists
    lot = db.query(ProductLot).filter(
        ProductLot.id == lot_id,
        ProductLot.product_id == product_id
    ).first()
    if not lot:
        raise HTTPException(status_code=404, detail="Lot introuvable")
    db.delete(lot)
    db.commit()