from pydantic import BaseModel, EmailStr, field_validator, model_validator
from typing import Optional, List
from datetime import datetime, date
from app.models.models import UserRole, UserStatus, MovementType, AlertType, AlertStatus


# ─── Auth Schemas ─────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user_id: int
    role: UserRole
    name: str


class RefreshTokenRequest(BaseModel):
    refresh_token: str


# ─── User Schemas ─────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: UserRole = UserRole.viewer

    @field_validator("password")
    @classmethod
    def password_strength(cls, v):
        if len(v) < 8:
            raise ValueError("Le mot de passe doit contenir au moins 8 caractères")
        return v


class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[UserRole] = None
    status: Optional[UserStatus] = None
    is_active: Optional[bool] = None


class UserPasswordChange(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v):
        if len(v) < 8:
            raise ValueError("Le mot de passe doit contenir au moins 8 caractères")
        return v


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: UserRole
    status: UserStatus
    is_active: bool
    created_at: datetime
    last_login: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ─── Supplier Schemas ─────────────────────────────────────────────────────────

class SupplierCreate(BaseModel):
    name: str
    contact: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None


class SupplierUpdate(BaseModel):
    name: Optional[str] = None
    contact: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None


class SupplierResponse(BaseModel):
    id: int
    name: str
    contact: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Location Schemas ─────────────────────────────────────────────────────────

class LocationCreate(BaseModel):
    name: str
    description: Optional[str] = None
    temperature_controlled: bool = False


class LocationUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    temperature_controlled: Optional[bool] = None


class LocationResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    temperature_controlled: bool

    model_config = {"from_attributes": True}


# ─── Category Schemas ─────────────────────────────────────────────────────────

class CategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None
    color: Optional[str] = None


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None


class CategoryResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    color: Optional[str] = None

    model_config = {"from_attributes": True}


# ─── Product Lot Schemas ──────────────────────────────────────────────────────

class ProductLotCreate(BaseModel):
    lot_number: str
    quantity: int
    expiry_date: Optional[date] = None
    notes: Optional[str] = None


class ProductLotResponse(BaseModel):
    id: int
    product_id: int
    lot_number: str
    quantity: int
    expiry_date: Optional[date] = None
    received_at: datetime
    notes: Optional[str] = None

    model_config = {"from_attributes": True}


# ─── Product Schemas ──────────────────────────────────────────────────────────

class ProductCreate(BaseModel):
    name: str
    reference: Optional[str] = None
    lot_number: Optional[str] = None
    description: Optional[str] = None
    current_stock: int = 0
    minimum_stock: int = 0
    alert_stock: int = 0
    unit: str = "unité"
    expiry_date: Optional[date] = None
    supplier_id: Optional[int] = None
    location_id: Optional[int] = None
    category_id: Optional[int] = None


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    reference: Optional[str] = None
    lot_number: Optional[str] = None
    description: Optional[str] = None
    current_stock: Optional[int] = None
    minimum_stock: Optional[int] = None
    alert_stock: Optional[int] = None
    unit: Optional[str] = None
    expiry_date: Optional[date] = None
    supplier_id: Optional[int] = None
    location_id: Optional[int] = None
    category_id: Optional[int] = None
    is_active: Optional[bool] = None


class ProductResponse(BaseModel):
    id: int
    name: str
    reference: Optional[str] = None
    lot_number: Optional[str] = None
    description: Optional[str] = None
    current_stock: int
    minimum_stock: int
    alert_stock: int
    unit: str
    expiry_date: Optional[date] = None
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    supplier: Optional[SupplierResponse] = None
    location: Optional[LocationResponse] = None
    category: Optional[CategoryResponse] = None
    lots: List[ProductLotResponse] = []

    model_config = {"from_attributes": True}


class ProductSummary(BaseModel):
    """Lightweight product for lists"""
    id: int
    name: str
    reference: Optional[str] = None
    current_stock: int
    minimum_stock: int
    alert_stock: int
    unit: str
    expiry_date: Optional[date] = None
    is_active: bool
    supplier_name: Optional[str] = None
    location_name: Optional[str] = None
    category_name: Optional[str] = None

    model_config = {"from_attributes": True}


# ─── Stock Movement Schemas ───────────────────────────────────────────────────

class StockMovementCreate(BaseModel):
    product_id: int
    movement_type: MovementType
    quantity: int
    lot_number: Optional[str] = None
    reason: Optional[str] = None
    reference_document: Optional[str] = None

    @field_validator("quantity")
    @classmethod
    def quantity_positive(cls, v):
        if v <= 0:
            raise ValueError("La quantité doit être positive")
        return v


class StockMovementResponse(BaseModel):
    id: int
    product_id: int
    product_name: Optional[str] = None
    user_id: int
    user_name: Optional[str] = None
    movement_type: MovementType
    quantity: int
    stock_before: int
    stock_after: int
    lot_number: Optional[str] = None
    reason: Optional[str] = None
    reference_document: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Alert Schemas ────────────────────────────────────────────────────────────

class AlertResponse(BaseModel):
    id: int
    product_id: int
    product_name: Optional[str] = None
    alert_type: AlertType
    status: AlertStatus
    message: str
    triggered_at: datetime
    acknowledged_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class AlertAcknowledge(BaseModel):
    comment: Optional[str] = None


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
    reference: Optional[str] = None
    current_stock: int
    minimum_stock: int
    alert_stock: int
    expiry_date: Optional[date] = None
    supplier_name: Optional[str] = None
    location_name: Optional[str] = None
    status: str  # "ok", "low", "out", "expiring", "expired"


# ─── Pagination ───────────────────────────────────────────────────────────────

class PaginatedResponse(BaseModel):
    items: list
    total: int
    page: int
    size: int
    pages: int