from typing import Optional, List
from datetime import datetime, date, timedelta
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_
from fastapi import HTTPException
from app.models.models import StockMovement, Product, MovementType, Alert, AlertType, AlertStatus, User
from app.schemas.schemas import StockMovementCreate
from app.core.config import settings


def create_movement(db: Session, data: StockMovementCreate, user: User) -> StockMovement:
    product = db.query(Product).filter(Product.id == data.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produit introuvable")

    stock_before = product.current_stock

    # Apply movement
    if data.movement_type in (MovementType.entry,):
        stock_after = stock_before + data.quantity
    elif data.movement_type in (MovementType.exit, MovementType.loss):
        if data.quantity > stock_before:
            raise HTTPException(
                status_code=400,
                detail=f"Stock insuffisant. Disponible: {stock_before}, Demandé: {data.quantity}",
            )
        stock_after = stock_before - data.quantity
    elif data.movement_type == MovementType.adjustment:
        # quantity is the new absolute value
        stock_after = data.quantity
    else:
        stock_after = stock_before + data.quantity

    # Record movement
    movement = StockMovement(
        product_id=data.product_id,
        user_id=user.id,
        movement_type=data.movement_type,
        quantity=data.quantity,
        stock_before=stock_before,
        stock_after=stock_after,
        lot_number=data.lot_number,
        reason=data.reason,
        reference_document=data.reference_document,
    )
    db.add(movement)

    # Update product stock
    product.current_stock = stock_after
    db.commit()
    db.refresh(movement)

    # Trigger alert checks
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


def _check_and_create_alerts(db: Session, product: Product):
    """Check product stock levels and expiry, create or resolve alerts."""
    today = date.today()
    expiry_warning_days = settings.EXPIRY_ALERT_DAYS_BEFORE

    # ── Out of stock ──
    if product.current_stock == 0:
        _upsert_alert(db, product.id, AlertType.out_of_stock,
                      f"Rupture de stock: {product.name} (stock=0)")
    else:
        _resolve_alert(db, product.id, AlertType.out_of_stock)

    # ── Low stock ──
    if product.alert_stock > 0 and 0 < product.current_stock <= product.alert_stock:
        _upsert_alert(db, product.id, AlertType.low_stock,
                      f"Stock faible: {product.name} ({product.current_stock} {product.unit} ≤ seuil {product.alert_stock})")
    elif product.current_stock > product.alert_stock:
        _resolve_alert(db, product.id, AlertType.low_stock)

    # ── Expiry ──
    if product.expiry_date:
        if product.expiry_date <= today:
            _upsert_alert(db, product.id, AlertType.expired,
                          f"Produit périmé: {product.name} (péremption: {product.expiry_date})")
        elif product.expiry_date <= today + timedelta(days=expiry_warning_days):
            _upsert_alert(db, product.id, AlertType.expiry_soon,
                          f"Péremption imminente: {product.name} dans {(product.expiry_date - today).days} jours ({product.expiry_date})")


def _upsert_alert(db: Session, product_id: int, alert_type: AlertType, message: str):
    existing = db.query(Alert).filter(
        and_(Alert.product_id == product_id, Alert.alert_type == alert_type, Alert.status == AlertStatus.active)
    ).first()
    if not existing:
        alert = Alert(product_id=product_id, alert_type=alert_type, message=message)
        db.add(alert)
        db.commit()


def _resolve_alert(db: Session, product_id: int, alert_type: AlertType):
    db.query(Alert).filter(
        and_(Alert.product_id == product_id, Alert.alert_type == alert_type, Alert.status == AlertStatus.active)
    ).update({"status": AlertStatus.resolved, "resolved_at": datetime.utcnow()})
    db.commit()