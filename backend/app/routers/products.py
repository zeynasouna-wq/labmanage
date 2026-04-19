from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.models import User
from app.core.dependencies import get_current_user, require_admin, require_technician_or_admin
from app.core.permissions import PermissionChecker, PermissionDenied
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
    size: int = Query(1000, ge=1, le=10000),
    search: Optional[str] = Query(None, description="Recherche par nom, référence ou lot"),
    supplier_id: Optional[int] = None,
    location_id: Optional[int] = None,
    category_id: Optional[int] = None,
    is_active: Optional[bool] = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # ✓ Tous peuvent lister les produits
    if not PermissionChecker.can_list_products(current_user):
        raise PermissionDenied("Accès refusé")
    
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
    current_user: User = Depends(get_current_user),
):
    # ✓ Admin et technicien peuvent créer
    if not PermissionChecker.can_create_product(current_user):
        raise PermissionDenied("Seuls les admins et techniciens peuvent créer des produits")
    
    return product_service.create_product(db, data)


@router.get("/{product_id}", response_model=ProductResponse, summary="Détail produit")
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # ✓ Tous peuvent voir un produit
    if not PermissionChecker.can_view_product(current_user):
        raise PermissionDenied("Accès refusé")
    
    return product_service.get_product(db, product_id)


@router.patch("/{product_id}", response_model=ProductResponse, summary="Modifier un produit")
def update_product(
    product_id: int,
    data: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # ✗ UNIQUEMENT admin peut modifier (PAS technicien)
    if not PermissionChecker.can_update_product(current_user):
        raise PermissionDenied("Seul un administrateur peut modifier les produits")
    
    return product_service.update_product(db, product_id, data)


@router.delete("/{product_id}", status_code=204, summary="Archiver un produit")
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # ✗ UNIQUEMENT admin peut supprimer
    if not PermissionChecker.can_delete_product(current_user):
        raise PermissionDenied("Seul un administrateur peut supprimer les produits")
    
    product_service.delete_product(db, product_id)


# ─── Lots ──────────────────────────────────────────────────────────────────────

@router.get("/{product_id}/lots", response_model=list[ProductLotResponse], summary="Lots du produit")
def get_lots(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # ✓ Tous peuvent voir les lots
    if not PermissionChecker.can_view_product(current_user):
        raise PermissionDenied("Accès refusé")
    
    return product_service.get_lots(db, product_id)


@router.post("/{product_id}/lots", response_model=ProductLotResponse, status_code=201, summary="Ajouter un lot")
def add_lot(
    product_id: int,
    data: ProductLotCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # ✓ Admin et technicien peuvent ajouter un lot
    if not PermissionChecker.can_create_product(current_user):
        raise PermissionDenied("Seuls les admins et techniciens peuvent ajouter des lots")
    
    return product_service.add_lot(db, product_id, data)


@router.patch("/{product_id}/lots/{lot_id}", response_model=ProductLotResponse, summary="Modifier un lot")
def update_lot(
    product_id: int,
    lot_id: int,
    data: ProductLotCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_technician_or_admin),
):
    return product_service.update_lot(db, product_id, lot_id, data)


@router.delete("/{product_id}/lots/{lot_id}", status_code=204, summary="Supprimer un lot")
def delete_lot(
    product_id: int,
    lot_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_technician_or_admin),
):
    product_service.delete_lot(db, product_id, lot_id)