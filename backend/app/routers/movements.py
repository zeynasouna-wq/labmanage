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


@router.post("/", response_model=StockMovementResponse, status_code=201, summary="Enregistrer un mouvement")
def create_movement(
    data: StockMovementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_technician_or_admin),
):
    """
    Types de mouvement:
    - **entry** : Entrée en stock (réception commande)
    - **exit** : Sortie de stock (utilisation)
    - **loss** : Perte / casse / périmé retiré
    - **adjustment** : Ajustement inventaire (la quantité devient le nouveau stock)
    """
    movement = movement_service.create_movement(db, data, current_user)
    # Enrich response
    resp = StockMovementResponse.model_validate(movement)
    resp.product_name = movement.product.name if movement.product else None
    resp.user_name = movement.user.name if movement.user else None
    return resp


@router.get("/", response_model=PaginatedResponse, summary="Historique des mouvements")
def list_movements(
    page: int = Query(1, ge=1),
    size: int = Query(30, ge=1, le=200),
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
        enriched.append(resp)

    return PaginatedResponse(
        items=enriched,
        total=total,
        page=page,
        size=size,
        pages=math.ceil(total / size) if total else 1,
    )