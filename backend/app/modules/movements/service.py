from datetime import date, datetime, timedelta

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.exceptions import NotFoundError, ValidationAppError
from app.models.models import (
    Alert,
    AlertType,
    MovementType,
    Product,
    StockMovement,
    User,
)
from app.modules.movements import repository
from app.modules.movements.schemas import StockMovementCreate
from app.modules.products import repository as products_repository


def create_movement(
    db: Session, data: StockMovementCreate, user: User
) -> StockMovement:
    # Validate product
    product = products_repository.get_by_id(db, data.product_id)
    if not product:
        raise NotFoundError("Produit introuvable")

    # Validate lot belongs to product
    lot = products_repository.get_lot_by_id(db, data.product_id, data.lot_id)
    if not lot:
        raise NotFoundError("Lot introuvable pour ce produit")

    stock_before = lot.quantity

    if data.movement_type == MovementType.entry:
        stock_after = stock_before + data.quantity
    elif data.movement_type in (MovementType.exit, MovementType.loss):
        if data.quantity > stock_before:
            raise ValidationAppError(
                f"Stock insuffisant dans ce lot. Disponible: {stock_before}, Demandé: {data.quantity}"
            )
        stock_after = stock_before - data.quantity
    elif data.movement_type == MovementType.adjustment:
        stock_after = data.quantity  # absolute value
    else:
        stock_after = stock_before + data.quantity

    movement = StockMovement(
        product_id=data.product_id,
        lot_id=data.lot_id,
        user_id=user.id,
        movement_type=data.movement_type,
        quantity=data.quantity,
        stock_before=stock_before,
        stock_after=stock_after,
        reason=data.reason,
        reference_document=data.reference_document,
        created_at=data.created_at
        or datetime.now(),  # Use provided date or current time
    )
    repository.add(db, movement)

    # Update lot stock
    lot.quantity = stock_after

    # ── Sync the product's current_stock column ──────────────────────────────
    # We can compute it directly without a round-trip: replace the lot value in
    # the current in-memory sum.
    product.current_stock = product.current_stock - stock_before + stock_after
    # ────────────────────────────────────────────────────────────────────────

    repository.commit(db)
    repository.refresh(db, movement)

    _check_and_create_alerts(db, product)

    return movement


def get_movements(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    product_id: int | None = None,
    movement_type: MovementType | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
) -> tuple[list[StockMovement], int]:
    return repository.list_movements(
        db,
        skip=skip,
        limit=limit,
        product_id=product_id,
        movement_type=movement_type,
        date_from=date_from,
        date_to=date_to,
    )


def get_movement(db: Session, movement_id: int) -> StockMovement:
    movement = repository.get_by_id(db, movement_id)
    if not movement:
        raise NotFoundError("Mouvement introuvable")
    return movement


def delete_movement(db: Session, movement_id: int) -> None:
    """Delete a movement and revert its stock changes."""
    movement = get_movement(db, movement_id)
    product = movement.product
    lot = movement.lot

    if not product:
        raise NotFoundError("Produit associé introuvable")
    if not lot:
        raise NotFoundError("Lot associé introuvable")

    # Revert lot quantity
    old_lot_qty = lot.quantity
    if movement.movement_type == MovementType.entry:
        lot.quantity -= movement.quantity
    elif movement.movement_type in (MovementType.exit, MovementType.loss):
        lot.quantity += movement.quantity
    elif movement.movement_type == MovementType.adjustment:
        lot.quantity = movement.stock_before

    # Sync product current_stock
    product.current_stock = product.current_stock - old_lot_qty + lot.quantity

    repository.delete(db, movement)
    repository.commit(db)

    _check_and_create_alerts(db, product)


def _check_and_create_alerts(db: Session, product: Product) -> None:
    """Check stock levels and expiry dates, create or resolve alerts."""
    today = date.today()
    expiry_warning_days = getattr(settings, "EXPIRY_ALERT_DAYS_BEFORE", 30)

    # Re-read current_stock from DB to be safe after commit
    repository.refresh(db, product)

    # ── Out of stock ──
    if product.current_stock == 0:
        _upsert_alert(
            db,
            product.id,
            AlertType.out_of_stock,
            f"Rupture de stock: {product.name} (stock total=0)",
        )
    else:
        _resolve_alert(db, product.id, AlertType.out_of_stock)

    # ── Low stock ──
    if product.alert_stock > 0 and 0 < product.current_stock <= product.alert_stock:
        _upsert_alert(
            db,
            product.id,
            AlertType.low_stock,
            f"Stock faible: {product.name} ({product.current_stock} ≤ seuil {product.alert_stock})",
        )
    elif product.current_stock > product.alert_stock:
        _resolve_alert(db, product.id, AlertType.low_stock)

    # ── Expiry — check each lot ──
    for lot in product.lots:
        if lot.expiry_date:
            if lot.expiry_date <= today:
                _upsert_alert(
                    db,
                    product.id,
                    AlertType.expired,
                    f"Lot périmé: {product.name} - Lot {lot.lot_number} (péremption: {lot.expiry_date})",
                )
            elif lot.expiry_date <= today + timedelta(days=expiry_warning_days):
                days_left = (lot.expiry_date - today).days
                _upsert_alert(
                    db,
                    product.id,
                    AlertType.expiry_soon,
                    f"Péremption imminente: {product.name} - Lot {lot.lot_number} dans {days_left} jours ({lot.expiry_date})",
                )


def _upsert_alert(
    db: Session, product_id: int, alert_type: AlertType, message: str
) -> None:
    existing = repository.get_active_alert(db, product_id, alert_type)
    if not existing:
        alert = Alert(product_id=product_id, alert_type=alert_type, message=message)
        repository.add_alert(db, alert)


def _resolve_alert(db: Session, product_id: int, alert_type: AlertType) -> None:
    repository.resolve_active_alerts(db, product_id, alert_type)
