from datetime import date, datetime

from pydantic import BaseModel, field_validator

from app.models.models import AlertStatus, AlertType, MovementType

# Auth and User schemas moved to app/modules/auth/schemas.py and
# app/modules/users/schemas.py (see docs/REFACTOR_LOG.md, users/auth module).
# Supplier, Location, Category and Product(Lot) schemas moved to their own
# app/modules/<domain>/schemas.py.


# ─── Stock Movement Schemas ───────────────────────────────────────────────────


class StockMovementCreate(BaseModel):
    product_id: int
    lot_id: int
    movement_type: MovementType
    quantity: int
    reason: str | None = None
    reference_document: str | None = None
    created_at: datetime | None = None  # Date optionnelle du mouvement

    @field_validator("quantity")
    @classmethod
    def quantity_positive(cls, v):
        if v <= 0:
            raise ValueError("La quantité doit être positive")
        return v


class StockMovementResponse(BaseModel):
    id: int
    product_id: int
    lot_id: int | None = None
    product_name: str | None = None
    lot_number: str | None = None
    user_id: int
    user_name: str | None = None
    movement_type: MovementType
    quantity: int
    stock_before: int
    stock_after: int
    reason: str | None = None
    reference_document: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Alert Schemas ────────────────────────────────────────────────────────────


class AlertResponse(BaseModel):
    id: int
    product_id: int
    product_name: str | None = None
    alert_type: AlertType
    status: AlertStatus
    message: str
    triggered_at: datetime
    acknowledged_at: datetime | None = None
    resolved_at: datetime | None = None

    model_config = {"from_attributes": True}


class AlertAcknowledge(BaseModel):
    comment: str | None = None


# ─── Dashboard / Stats Schemas ────────────────────────────────────────────────


class DashboardStats(BaseModel):
    total_products: int
    active_products: int
    out_of_stock: int
    low_stock: int
    expiring_soon: int
    expired: int
    total_movements_today: int
    active_alerts: int


class StockReport(BaseModel):
    product_id: int
    product_name: str
    reference: str | None = None
    current_stock: int
    minimum_stock: int
    alert_stock: int
    expiry_date: date | None = None
    supplier_name: str | None = None
    location_name: str | None = None
    status: str  # "ok", "low", "out", "expiring", "expired"


# ─── Pagination ───────────────────────────────────────────────────────────────


class PaginatedResponse(BaseModel):
    items: list
    total: int
    page: int
    size: int
    pages: int
