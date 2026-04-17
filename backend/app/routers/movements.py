from typing import Optional
from datetime import date
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.models import User, MovementType
from app.core.dependencies import get_current_user, require_technician_or_admin
from app.schemas.schemas import StockMovementCreate, StockMovementResponse, PaginatedResponse
from app.services import movement_service
import math

router = APIRouter(prefix="/movements", tags=["Mouvements de stock"])


@router.get("/", response_model=PaginatedResponse, summary="Historique des mouvements")
def list_movements(
    page: int = Query(1, ge=1),
    size: int = Query(1000, ge=1, le=10000),
    product_id: Optional[int] = None,
    movement_type: Optional[MovementType] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    skip = (page - 1) * size
    items, total = movement_service.get_movements(
        db, skip=skip, limit=size,
        product_id=product_id, movement_type=movement_type,
        date_from=date_from, date_to=date_to,
    )
    enriched = []
    for m in items:
        resp = StockMovementResponse.model_validate(m)
        resp.product_name = m.product.name if m.product else None
        resp.user_name = m.user.name if m.user else None
        resp.lot_number = m.lot.lot_number if m.lot else None
        enriched.append(resp)

    return PaginatedResponse(
        items=enriched,
        total=total,
        page=page,
        size=size,
        pages=math.ceil(total / size) if total else 1,
    )


@router.post("/", response_model=StockMovementResponse, status_code=201, summary="Enregistrer un mouvement")
def create_movement(
    data: StockMovementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_technician_or_admin),
):
    movement = movement_service.create_movement(db, data, current_user)
    resp = StockMovementResponse.model_validate(movement)
    resp.product_name = movement.product.name if movement.product else None
    resp.user_name = movement.user.name if movement.user else None
    resp.lot_number = movement.lot.lot_number if movement.lot else None
    return resp


@router.get("/{movement_id}", response_model=StockMovementResponse, summary="Détail mouvement")
def get_movement(
    movement_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return movement_service.get_movement(db, movement_id)


@router.delete("/{movement_id}", status_code=204, summary="Supprimer un mouvement")
def delete_movement(
    movement_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_technician_or_admin),
):
    movement_service.delete_movement(db, movement_id)