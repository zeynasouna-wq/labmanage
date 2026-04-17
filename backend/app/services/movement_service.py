from typing import Optional, List
from datetime import datetime, date, timedelta
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_
from fastapi import HTTPException
from app.models.models import StockMovement, Product, ProductLot, MovementType, Alert, AlertType, AlertStatus, User
from app.schemas.schemas import StockMovementCreate
from app.core.config import settings


def _sync_product_stock(db: Session, product: Product) -> None:
    """
    Recalcule current_stock à partir des lots et persiste la valeur.
    À appeler AVANT db.commit() après toute mutation d'un lot.
    """
    db.refresh(product)          # recharge les lots depuis la base
    product.current_stock = sum(lot.quantity for lot in product.lots)


def create_movement(db: Session, data: StockMovementCreate, user: User) -> StockMovement:
    # Validate product
    product = db.query(Product).filter(Product.id == data.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produit introuvable")

    # Validate lot belongs to product
    lot = db.query(ProductLot).filter(
        ProductLot.id == data.lot_id,
        ProductLot.product_id == data.product_id,
    ).first()
    if not lot:
        raise HTTPException(status_code=404, detail="Lot introuvable pour ce produit")

    stock_before = lot.quantity

    if data.movement_type == MovementType.entry:
        stock_after = stock_before + data.quantity
    elif data.movement_type in (MovementType.exit, MovementType.loss):
        if data.quantity > stock_before:
            raise HTTPException(
                status_code=400,
                detail=f"Stock insuffisant dans ce lot. Disponible: {stock_before}, Demandé: {data.quantity}",
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
    )
    db.add(movement)

    # Update lot stock
    lot.quantity = stock_after

    # ── Sync the product's current_stock column ──────────────────────────────
    # We can compute it directly without a round-trip: replace the lot value in
    # the current in-memory sum.
    product.current_stock = product.current_stock - stock_before + stock_after
    # ────────────────────────────────────────────────────────────────────────

    db.commit()
    db.refresh(movement)

    _check_and_create_alerts(db, product)

    return movement


def get_movements(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    product_id: Optional[int] = None,
    movement_type: Optional[MovementType] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
) -> tuple[List[StockMovement], int]:
    query = db.query(StockMovement).options(
        joinedload(StockMovement.product),
        joinedload(StockMovement.user),
        joinedload(StockMovement.lot),
    )

    if product_id:
        query = query.filter(StockMovement.product_id == product_id)
    if movement_type:
        query = query.filter(StockMovement.movement_type == movement_type)
    if date_from:
        query = query.filter(StockMovement.created_at >= datetime.combine(date_from, datetime.min.time()))
    if date_to:
        query = query.filter(StockMovement.created_at <= datetime.combine(date_to, datetime.max.time()))

    total = query.count()
    items = query.order_by(StockMovement.created_at.desc()).offset(skip).limit(limit).all()
    return items, total


def get_movement(db: Session, movement_id: int) -> StockMovement:
    movement = (
        db.query(StockMovement)
        .options(
            joinedload(StockMovement.product),
            joinedload(StockMovement.user),
            joinedload(StockMovement.lot),
        )
        .filter(StockMovement.id == movement_id)
        .first()
    )
    if not movement:
        raise HTTPException(status_code=404, detail="Mouvement introuvable")
    return movement


def delete_movement(db: Session, movement_id: int):
    """Delete a movement and revert its stock changes."""
    movement = get_movement(db, movement_id)
    product = movement.product
    lot = movement.lot

    if not product:
        raise HTTPException(status_code=404, detail="Produit associé introuvable")
    if not lot:
        raise HTTPException(status_code=404, detail="Lot associé introuvable")

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

    db.delete(movement)
    db.commit()

    _check_and_create_alerts(db, product)


def _check_and_create_alerts(db: Session, product: Product):
    """Check stock levels and expiry dates, create or resolve alerts."""
    today = date.today()
    expiry_warning_days = getattr(settings, "EXPIRY_ALERT_DAYS_BEFORE", 30)

    # Re-read current_stock from DB to be safe after commit
    db.refresh(product)

    # ── Out of stock ──
    if product.current_stock == 0:
        _upsert_alert(db, product.id, AlertType.out_of_stock,
                      f"Rupture de stock: {product.name} (stock total=0)")
    else:
        _resolve_alert(db, product.id, AlertType.out_of_stock)

    # ── Low stock ──
    if product.alert_stock > 0 and 0 < product.current_stock <= product.alert_stock:
        _upsert_alert(db, product.id, AlertType.low_stock,
                      f"Stock faible: {product.name} ({product.current_stock} ≤ seuil {product.alert_stock})")
    elif product.current_stock > product.alert_stock:
        _resolve_alert(db, product.id, AlertType.low_stock)

    # ── Expiry — check each lot ──
    for lot in product.lots:
        if lot.expiry_date:
            if lot.expiry_date <= today:
                _upsert_alert(
                    db, product.id, AlertType.expired,
                    f"Lot périmé: {product.name} - Lot {lot.lot_number} (péremption: {lot.expiry_date})",
                )
            elif lot.expiry_date <= today + timedelta(days=expiry_warning_days):
                days_left = (lot.expiry_date - today).days
                _upsert_alert(
                    db, product.id, AlertType.expiry_soon,
                    f"Péremption imminente: {product.name} - Lot {lot.lot_number} dans {days_left} jours ({lot.expiry_date})",
                )


def _upsert_alert(db: Session, product_id: int, alert_type: AlertType, message: str):
    existing = db.query(Alert).filter(
        and_(
            Alert.product_id == product_id,
            Alert.alert_type == alert_type,
            Alert.status == AlertStatus.active,
        )
    ).first()
    if not existing:
        alert = Alert(product_id=product_id, alert_type=alert_type, message=message)
        db.add(alert)
        db.commit()


def _resolve_alert(db: Session, product_id: int, alert_type: AlertType):
    db.query(Alert).filter(
        and_(
            Alert.product_id == product_id,
            Alert.alert_type == alert_type,
            Alert.status == AlertStatus.active,
        )
    ).update({"status": AlertStatus.resolved, "resolved_at": datetime.utcnow()})
    db.commit()