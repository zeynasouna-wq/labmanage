from datetime import date, datetime

from pydantic import BaseModel, field_validator

from app.modules.categories.schemas import CategoryResponse
from app.modules.locations.schemas import LocationResponse
from app.modules.suppliers.schemas import SupplierResponse


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
