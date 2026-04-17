from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.models import User
from app.core.dependencies import get_current_user, require_admin
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
    _: User = Depends(get_current_user),
):
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
    _: User = Depends(require_admin),
):
    """Only admins can create suppliers."""
    return supplier_service.create_supplier(db, data)


@router.get("/{supplier_id}", response_model=SupplierResponse, summary="Détail fournisseur")
def get_supplier(
    supplier_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return supplier_service.get_supplier(db, supplier_id)


@router.patch("/{supplier_id}", response_model=SupplierResponse, summary="Modifier un fournisseur")
def update_supplier(
    supplier_id: int,
    data: SupplierUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    return supplier_service.update_supplier(db, supplier_id, data)


@router.delete("/{supplier_id}", status_code=204, summary="Supprimer un fournisseur")
def delete_supplier(
    supplier_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    supplier_service.delete_supplier(db, supplier_id)
