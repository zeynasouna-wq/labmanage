from datetime import date, datetime

from pydantic import BaseModel, field_validator

from app.models.models import AlertStatus, AlertType, MovementType

# Auth and User schemas moved to app/modules/auth/schemas.py and
# app/modules/users/schemas.py (see docs/REFACTOR_LOG.md, users/auth module).


# ─── Supplier Schemas ─────────────────────────────────────────────────────────


class SupplierCreate(BaseModel):
    name: str
    contact: str | None = None
    email: str | None = None
    phone: str | None = None
    address: str | None = None


class SupplierUpdate(BaseModel):
    name: str | None = None
    contact: str | None = None
    email: str | None = None
    phone: str | None = None
    address: str | None = None


class SupplierResponse(BaseModel):
    id: int
    name: str
    contact: str | None = None
    email: str | None = None
    phone: str | None = None
    address: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Location Schemas ─────────────────────────────────────────────────────────


class LocationCreate(BaseModel):
    name: str
    description: str | None = None
    temperature_controlled: bool = False


class LocationUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    temperature_controlled: bool | None = None


class LocationResponse(BaseModel):
    id: int
    name: str
    description: str | None = None
    temperature_controlled: bool

    model_config = {"from_attributes": True}


# ─── Category Schemas ─────────────────────────────────────────────────────────


class CategoryCreate(BaseModel):
    name: str
    description: str | None = None
    color: str | None = None


class CategoryUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    color: str | None = None


class CategoryResponse(BaseModel):
    id: int
    name: str
    description: str | None = None
    color: str | None = None

    model_config = {"from_attributes": True}


# ─── Product Lot Schemas ──────────────────────────────────────────────────────


class ProductLotCreate(BaseModel):
    lot_number: str
    quantity: int
    expiry_date: date | None = None
    notes: str | None = None

    @field_validator("quantity")
    @classmethod
    def quantity_positive(cls, v):
        if v < 0:
            raise ValueError("La quantité du lot doit être positive")
        return v


class ProductLotResponse(BaseModel):
    id: int
    product_id: int
    lot_number: str
    quantity: int
    expiry_date: date | None = None
    received_at: datetime
    notes: str | None = None

    model_config = {"from_attributes": True}


# ─── Product Schemas ──────────────────────────────────────────────────────────


class ProductCreate(BaseModel):
    name: str
    reference: str
    description: str | None = None
    minimum_stock: int = 0
    alert_stock: int = 0
    supplier_id: int | None = None
    location_id: int | None = None
    category_id: int | None = None
    lots: list[ProductLotCreate] = []

    @field_validator("reference")
    @classmethod
    def reference_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError("La référence du produit est obligatoire")
        return v.strip()

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError("Le nom du produit est obligatoire")
        return v.strip()

    @field_validator("minimum_stock")
    @classmethod
    def minimum_stock_non_negative(cls, v):
        if v < 0:
            raise ValueError("Le stock minimum ne peut pas être négatif")
        return v

    @field_validator("alert_stock")
    @classmethod
    def alert_stock_non_negative(cls, v):
        if v < 0:
            raise ValueError("Le seuil d'alerte ne peut pas être négatif")
        return v


class ProductUpdate(BaseModel):
    name: str | None = None
    reference: str | None = None
    description: str | None = None
    minimum_stock: int | None = None
    alert_stock: int | None = None
    supplier_id: int | None = None
    location_id: int | None = None
    category_id: int | None = None
    is_active: bool | None = None

    @field_validator("minimum_stock")
    @classmethod
    def minimum_stock_non_negative(cls, v):
        if v is not None and v < 0:
            raise ValueError("Le stock minimum ne peut pas être négatif")
        return v

    @field_validator("alert_stock")
    @classmethod
    def alert_stock_non_negative(cls, v):
        if v is not None and v < 0:
            raise ValueError("Le seuil d'alerte ne peut pas être négatif")
        return v


class ProductResponse(BaseModel):
    id: int
    name: str
    reference: str
    description: str | None = None
    current_stock: int
    minimum_stock: int
    alert_stock: int
    is_active: bool
    created_at: datetime
    updated_at: datetime | None = None
    supplier: SupplierResponse | None = None
    location: LocationResponse | None = None
    category: CategoryResponse | None = None
    lots: list[ProductLotResponse] = []

    model_config = {"from_attributes": True}


class ProductSummary(BaseModel):
    """Lightweight product for lists"""

    id: int
    name: str
    reference: str
    current_stock: int
    minimum_stock: int
    alert_stock: int
    is_active: bool
    supplier_name: str | None = None
    location_name: str | None = None
    category_name: str | None = None

    model_config = {"from_attributes": True}


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
