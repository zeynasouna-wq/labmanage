from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.models import User
from app.core.dependencies import get_current_user, require_technician_or_admin, require_admin
from app.schemas.schemas import (
    ProductCreate, ProductUpdate, ProductResponse,
    ProductLotCreate, ProductLotResponse, PaginatedResponse
)
from app.services import product_service
import math

router = APIRouter(prefix="/products", tags=["Produits"])


@router.get("/", response_model=PaginatedResponse, summary="Lister les produits")
def list_products(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None, description="Recherche par nom, référence ou lot"),
    supplier_id: Optional[int] = None,
    location_id: Optional[int] = None,
    category_id: Optional[int] = None,
    is_active: Optional[bool] = True,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    skip = (page - 1) * size
    items, total = product_service.get_products(
        db, skip=skip, limit=size, search=search,
        supplier_id=supplier_id, location_id=location_id,
        category_id=category_id, is_active=is_active,
    )
    return PaginatedResponse(
        items=[ProductResponse.model_validate(p) for p in items],
        total=total,
        page=page,
        size=size,
        pages=math.ceil(total / size) if total else 1,
    )


@router.post("/", response_model=ProductResponse, status_code=201, summary="Créer un produit")
def create_product(
    data: ProductCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_technician_or_admin),
):
    return product_service.create_product(db, data)


@router.get("/{product_id}", response_model=ProductResponse, summary="Détail produit")
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return product_service.get_product(db, product_id)


@router.patch("/{product_id}", response_model=ProductResponse, summary="Modifier un produit")
def update_product(
    product_id: int,
    data: ProductUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_technician_or_admin),
):
    return product_service.update_product(db, product_id, data)


@router.delete("/{product_id}", status_code=204, summary="Archiver un produit")
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    product_service.delete_product(db, product_id)


# ─── Lots ──────────────────────────────────────────────────────────────────────

@router.get("/{product_id}/lots", response_model=list[ProductLotResponse], summary="Lots du produit")
def get_lots(
    product_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return product_service.get_lots(db, product_id)


@router.post("/{product_id}/lots", response_model=ProductLotResponse, status_code=201, summary="Ajouter un lot")
def add_lot(
    product_id: int,
    data: ProductLotCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_technician_or_admin),
):
    return product_service.add_lot(db, product_id, data)