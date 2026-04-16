from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import or_
from fastapi import HTTPException
from app.models.models import Supplier
from app.schemas.schemas import SupplierCreate, SupplierUpdate


def get_suppliers(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
) -> tuple[List[Supplier], int]:
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


def get_supplier(db: Session, supplier_id: int) -> Supplier:
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Fournisseur introuvable")
    return supplier


def create_supplier(db: Session, data: SupplierCreate) -> Supplier:
    # Check if supplier with same name already exists
    existing = db.query(Supplier).filter(Supplier.name == data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Un fournisseur avec ce nom existe déjà")

    supplier = Supplier(**data.model_dump())
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    return supplier


def update_supplier(db: Session, supplier_id: int, data: SupplierUpdate) -> Supplier:
    supplier = get_supplier(db, supplier_id)
    
    # Check if new name conflicts with another supplier
    if data.name and data.name != supplier.name:
        existing = db.query(Supplier).filter(Supplier.name == data.name).first()
        if existing:
            raise HTTPException(status_code=400, detail="Un fournisseur avec ce nom existe déjà")
    
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(supplier, field, value)
    db.commit()
    db.refresh(supplier)
    return supplier


def delete_supplier(db: Session, supplier_id: int):
    supplier = get_supplier(db, supplier_id)
    
    # Check if supplier has products
    if supplier.products:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete supplier with {len(supplier.products)} product(s). Remove products first."
        )
    
    db.delete(supplier)
    db.commit()
