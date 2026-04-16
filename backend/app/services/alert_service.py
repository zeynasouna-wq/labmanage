from datetime import datetime, date, timedelta
from typing import Optional, List
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_
from fastapi import HTTPException
from app.models.models import Alert, AlertStatus, AlertType, Product, User
from app.core.config import settings


def get_alerts(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    status: Optional[AlertStatus] = None,
    alert_type: Optional[AlertType] = None,
) -> tuple[List[Alert], int]:
    query = db.query(Alert).options(joinedload(Alert.product))

    if status:
        query = query.filter(Alert.status == status)
    if alert_type:
        query = query.filter(Alert.alert_type == alert_type)

    total = query.count()
    items = query.order_by(Alert.triggered_at.desc()).offset(skip).limit(limit).all()
    return items, total


def acknowledge_alert(db: Session, alert_id: int, user: User) -> Alert:
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alerte introuvable")
    alert.status = AlertStatus.acknowledged
    alert.acknowledged_at = datetime.utcnow()
    alert.acknowledged_by_id = user.id
    db.commit()
    db.refresh(alert)
    return alert


def run_global_alert_scan(db: Session):
    """Scheduled task: scan all products and generate/update alerts."""
    today = date.today()
    expiry_warning = settings.EXPIRY_ALERT_DAYS_BEFORE
    products = db.query(Product).filter(Product.is_active == True).all()

    for product in products:
        # Out of stock
        if product.current_stock == 0:
            _upsert(db, product.id, AlertType.out_of_stock,
                    f"Rupture de stock: {product.name}")
        else:
            _resolve(db, product.id, AlertType.out_of_stock)

        # Low stock
        if product.alert_stock > 0 and 0 < product.current_stock <= product.alert_stock:
            _upsert(db, product.id, AlertType.low_stock,
                    f"Stock faible: {product.name} — {product.current_stock} {product.unit}")
        elif product.current_stock > product.alert_stock:
            _resolve(db, product.id, AlertType.low_stock)

        # Expiry
        if product.expiry_date:
            if product.expiry_date <= today:
                _upsert(db, product.id, AlertType.expired,
                        f"Produit périmé: {product.name} ({product.expiry_date})")
                _resolve(db, product.id, AlertType.expiry_soon)
            elif product.expiry_date <= today + timedelta(days=expiry_warning):
                days_left = (product.expiry_date - today).days
                _upsert(db, product.id, AlertType.expiry_soon,
                        f"Péremption dans {days_left} jours: {product.name} ({product.expiry_date})")
            else:
                _resolve(db, product.id, AlertType.expiry_soon)
                _resolve(db, product.id, AlertType.expired)


def _upsert(db: Session, product_id: int, alert_type: AlertType, message: str):
    existing = db.query(Alert).filter(
        and_(Alert.product_id == product_id, Alert.alert_type == alert_type,
             Alert.status.in_([AlertStatus.active, AlertStatus.acknowledged]))
    ).first()
    if not existing:
        db.add(Alert(product_id=product_id, alert_type=alert_type, message=message))
        db.commit()


def _resolve(db: Session, product_id: int, alert_type: AlertType):
    db.query(Alert).filter(
        and_(Alert.product_id == product_id, Alert.alert_type == alert_type,
             Alert.status == AlertStatus.active)
    ).update({"status": AlertStatus.resolved, "resolved_at": datetime.utcnow()})
    db.commit()