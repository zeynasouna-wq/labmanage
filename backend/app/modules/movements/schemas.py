from datetime import datetime

from pydantic import BaseModel, field_validator

from app.models.models import MovementType


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
