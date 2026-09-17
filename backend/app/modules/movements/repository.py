from datetime import date, datetime

from sqlalchemy import and_
from sqlalchemy.orm import Session, joinedload

from app.models.models import Alert, AlertStatus, AlertType, MovementType, StockMovement


def _with_relations(query):
    return query.options(
        joinedload(StockMovement.product),
        joinedload(StockMovement.user),
        joinedload(StockMovement.lot),
    )


def list_movements(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    product_id: int | None = None,
    movement_type: MovementType | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
) -> tuple[list[StockMovement], int]:
    query = _with_relations(db.query(StockMovement))

    if product_id:
        query = query.filter(StockMovement.product_id == product_id)
    if movement_type:
        query = query.filter(StockMovement.movement_type == movement_type)
    if date_from:
        query = query.filter(
            StockMovement.created_at >= datetime.combine(date_from, datetime.min.time())
        )
    if date_to:
        query = query.filter(
            StockMovement.created_at <= datetime.combine(date_to, datetime.max.time())
        )

    total = query.count()
    items = (
        query.order_by(StockMovement.created_at.desc()).offset(skip).limit(limit).all()
    )
    return items, total


def get_by_id(db: Session, movement_id: int) -> StockMovement | None:
    return (
        _with_relations(db.query(StockMovement))
        .filter(StockMovement.id == movement_id)
        .first()
    )


def add(db: Session, movement: StockMovement) -> None:
    db.add(movement)


def delete(db: Session, movement: StockMovement) -> None:
    db.delete(movement)


def commit(db: Session) -> None:
    db.commit()


def refresh(db: Session, obj) -> None:
    db.refresh(obj)


def get_active_alert(
    db: Session, product_id: int, alert_type: AlertType
) -> Alert | None:
    return (
        db.query(Alert)
        .filter(
            and_(
                Alert.product_id == product_id,
                Alert.alert_type == alert_type,
                Alert.status == AlertStatus.active,
            )
        )
        .first()
    )


def add_alert(db: Session, alert: Alert) -> None:
    db.add(alert)
    db.commit()


def resolve_active_alerts(db: Session, product_id: int, alert_type: AlertType) -> None:
    db.query(Alert).filter(
        and_(
            Alert.product_id == product_id,
            Alert.alert_type == alert_type,
            Alert.status == AlertStatus.active,
        )
    ).update({"status": AlertStatus.resolved, "resolved_at": datetime.utcnow()})
    db.commit()
