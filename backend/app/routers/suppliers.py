from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.models import User
from app.core.dependencies import get_current_user, require_admin
from app.core.permissions import PermissionChecker, PermissionDenied
from app.schemas.schemas import (
    SupplierCreate, SupplierUpdate, SupplierResponse, PaginatedResponse
)
from app.services import supplier_service
import math

router = APIRouter(prefix="/suppliers", tags=["Fournisseurs"])


@router.get("/", response_model=PaginatedResponse, summary="Lister les fournisseurs")
def list_suppliers(
    page: int = Query(1, ge=1),
    size: int = Query(1000, ge=1, le=10000),
    search: Optional[str] = Query(None, description="Recherche par nom, contact ou email"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # ✓ Tous peuvent voir les fournisseurs (lecture seule)
    if not PermissionChecker.can_list_suppliers(current_user):
        raise PermissionDenied("Accès refusé")
    
    skip = (page - 1) * size
    items, total = supplier_service.get_suppliers(
        db, skip=skip, limit=size, search=search
    )
    return PaginatedResponse(
        items=[SupplierResponse.model_validate(s) for s in items],
        total=total,
        page=page,
        size=size,
        pages=math.ceil(total / size) if total else 1,
    )


@router.post("/", response_model=SupplierResponse, status_code=201, summary="Créer un fournisseur")
def create_supplier(
    data: SupplierCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # ✗ UNIQUEMENT admin peut créer des fournisseurs
    if not PermissionChecker.can_create_supplier(current_user):
        raise PermissionDenied("Seul un administrateur peut créer des fournisseurs")
    
    return supplier_service.create_supplier(db, data)


@router.get("/{supplier_id}", response_model=SupplierResponse, summary="Détail fournisseur")
def get_supplier(
    supplier_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # ✗ UNIQUEMENT admin et technicien peuvent voir un fournisseur
    if not PermissionChecker.can_view_supplier(current_user):
        raise PermissionDenied("Accès refusé. La gestion des fournisseurs est réservée aux admins et techniciens")
    
    return supplier_service.get_supplier(db, supplier_id)


@router.patch("/{supplier_id}", response_model=SupplierResponse, summary="Modifier un fournisseur")
def update_supplier(
    supplier_id: int,
    data: SupplierUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # ✗ UNIQUEMENT admin peut modifier les fournisseurs
    if not PermissionChecker.can_update_supplier(current_user):
        raise PermissionDenied("Seul un administrateur peut modifier les fournisseurs")
    
    return supplier_service.update_supplier(db, supplier_id, data)


@router.delete("/{supplier_id}", status_code=204, summary="Supprimer un fournisseur")
def delete_supplier(
    supplier_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # ✗ UNIQUEMENT admin peut supprimer les fournisseurs
    if not PermissionChecker.can_delete_supplier(current_user):
        raise PermissionDenied("Seul un administrateur peut supprimer les fournisseurs")
    
    supplier_service.delete_supplier(db, supplier_id)
