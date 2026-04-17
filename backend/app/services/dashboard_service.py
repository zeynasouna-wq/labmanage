from datetime import date, datetime, timedelta
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, and_
from app.models.models import Product, ProductLot, StockMovement, Alert, AlertStatus, AlertType, MovementType
from app.schemas.schemas import DashboardStats, StockReport
from app.core.config import settings


def get_dashboard_stats(db: Session) -> DashboardStats:
    today = date.today()
    today_start = datetime.combine(today, datetime.min.time())
    expiry_warning = settings.EXPIRY_ALERT_DAYS_BEFORE

    total_products = db.query(Product).filter(Product.is_active == True).count()

    out_of_stock = db.query(Product).filter(
        Product.is_active == True,
        Product.current_stock == 0,
    ).count()

    low_stock = db.query(Product).filter(
        Product.is_active == True,
        Product.alert_stock > 0,
        Product.current_stock > 0,
        Product.current_stock <= Product.alert_stock,
    ).count()

    # expiry_date is on ProductLot, not on Product — query via lots
    expiring_soon = (
        db.query(Product.id)
        .join(Product.lots)
        .filter(
            Product.is_active == True,
            ProductLot.expiry_date != None,
            ProductLot.expiry_date > today,
            ProductLot.expiry_date <= today + timedelta(days=expiry_warning),
            ProductLot.quantity > 0,
        )
        .distinct()
        .count()
    )

    expired = (
        db.query(Product.id)
        .join(Product.lots)
        .filter(
            Product.is_active == True,
            ProductLot.expiry_date != None,
            ProductLot.expiry_date <= today,
            ProductLot.quantity > 0,
        )
        .distinct()
        .count()
    )

    movements_today = db.query(StockMovement).filter(
        StockMovement.created_at >= today_start
    ).count()

    active_alerts = db.query(Alert).filter(Alert.status == AlertStatus.active).count()

    return DashboardStats(
        total_products=total_products,
        active_products=total_products,
        out_of_stock=out_of_stock,
        low_stock=low_stock,
        expiring_soon=expiring_soon,
        expired=expired,
        total_movements_today=movements_today,
        active_alerts=active_alerts,
    )


def get_stock_report(db: Session) -> list[StockReport]:
    today = date.today()
    expiry_warning = settings.EXPIRY_ALERT_DAYS_BEFORE

    products = (
        db.query(Product)
        .options(joinedload(Product.lots), joinedload(Product.supplier), joinedload(Product.location))
        .filter(Product.is_active == True)
        .all()
    )

    report = []
    for p in products:
        # Determine earliest relevant expiry from lots
        lot_expiries = [lot.expiry_date for lot in p.lots if lot.expiry_date and lot.quantity > 0]
        nearest_expiry = min(lot_expiries) if lot_expiries else None

        if p.current_stock == 0:
            status = "out"
        elif p.alert_stock > 0 and p.current_stock <= p.alert_stock:
            status = "low"
        elif nearest_expiry and nearest_expiry <= today:
            status = "expired"
        elif nearest_expiry and nearest_expiry <= today + timedelta(days=expiry_warning):
            status = "expiring"
        else:
            status = "ok"

        report.append(StockReport(
            product_id=p.id,
            product_name=p.name,
            reference=p.reference,
            current_stock=p.current_stock,
            minimum_stock=p.minimum_stock,
            alert_stock=p.alert_stock,
            expiry_date=nearest_expiry,
            supplier_name=p.supplier.name if p.supplier else None,
            location_name=p.location.name if p.location else None,
            status=status,
        ))

    return report


def get_movement_stats(db: Session, days: int = 30) -> dict:
    since = datetime.utcnow() - timedelta(days=days)
    movements = (
        db.query(
            StockMovement.movement_type,
            func.count(StockMovement.id).label("count"),
            func.sum(StockMovement.quantity).label("total_qty"),
        )
        .filter(StockMovement.created_at >= since)
        .group_by(StockMovement.movement_type)
        .all()
    )
    return {
        m.movement_type.value: {"count": m.count, "total_qty": m.total_qty}
        for m in movements
    }