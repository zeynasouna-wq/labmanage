from datetime import date, datetime

from pydantic import BaseModel

from app.models.models import AlertStatus, AlertType

# Auth and User schemas moved to app/modules/auth/schemas.py and
# app/modules/users/schemas.py (see docs/REFACTOR_LOG.md, users/auth module).
# Supplier, Location, Category, Product(Lot) and StockMovement schemas moved
# to their own app/modules/<domain>/schemas.py.


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
