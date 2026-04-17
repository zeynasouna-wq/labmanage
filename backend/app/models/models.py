from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime,
    ForeignKey, Text, Enum as SAEnum, Date
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base
import enum


# ─── Enums ────────────────────────────────────────────────────────────────────

class UserRole(str, enum.Enum):
    admin = "admin"
    technician = "technician"
    viewer = "viewer"


class UserStatus(str, enum.Enum):
    active = "active"
    pending = "pending"
    disabled = "disabled"


class MovementType(str, enum.Enum):
    entry = "entry"
    exit = "exit"
    adjustment = "adjustment"
    loss = "loss"


class AlertType(str, enum.Enum):
    low_stock = "low_stock"
    out_of_stock = "out_of_stock"
    expiry_soon = "expiry_soon"
    expired = "expired"


class AlertStatus(str, enum.Enum):
    active = "active"
    acknowledged = "acknowledged"
    resolved = "resolved"


# ─── Models ───────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(SAEnum(UserRole), default=UserRole.viewer, nullable=False)
    status = Column(SAEnum(UserStatus), default=UserStatus.pending, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_login = Column(DateTime(timezone=True), nullable=True)

    # Relations
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    movements = relationship("StockMovement", back_populates="user", foreign_keys="StockMovement.user_id")
    acknowledged_alerts = relationship("Alert", back_populates="acknowledged_by")


class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), unique=True, nullable=False)
    contact = Column(String(150), nullable=True)
    email = Column(String(150), nullable=True)
    phone = Column(String(50), nullable=True)
    address = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    products = relationship("Product", back_populates="supplier")


class Location(Base):
    __tablename__ = "locations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    temperature_controlled = Column(Boolean, default=False)

    products = relationship("Product", back_populates="location")


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    color = Column(String(7), nullable=True)  # hex color

    products = relationship("Product", back_populates="category")


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    reference = Column(String(100), unique=True, nullable=False, index=True)  # Référence UNIQUE
    description = Column(Text, nullable=True)

    # Stock - calculé à partir des lots
    minimum_stock = Column(Integer, default=0, nullable=False)
    alert_stock = Column(Integer, default=0, nullable=False)

    # Dates
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Foreign keys
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=True)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)

    is_active = Column(Boolean, default=True)

    # Relations
    supplier = relationship("Supplier", back_populates="products")
    location = relationship("Location", back_populates="products")
    category = relationship("Category", back_populates="products")
    movements = relationship("StockMovement", back_populates="product", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="product", cascade="all, delete-orphan")
    lots = relationship("ProductLot", back_populates="product", cascade="all, delete-orphan")

    @property
    def current_stock(self) -> int:
        """Stock total = somme des stocks de tous les lots"""
        return sum(lot.quantity for lot in self.lots)


class ProductLot(Base):
    """Gestion multi-lots par produit"""
    __tablename__ = "product_lots"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    lot_number = Column(String(200), nullable=False)
    quantity = Column(Integer, default=0, nullable=False)
    expiry_date = Column(Date, nullable=True)
    received_at = Column(DateTime(timezone=True), server_default=func.now())
    notes = Column(Text, nullable=True)

    product = relationship("Product", back_populates="lots")
    movements = relationship("StockMovement", back_populates="lot", cascade="all, delete-orphan")


class StockMovement(Base):
    __tablename__ = "stock_movements"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    lot_id = Column(Integer, ForeignKey("product_lots.id"), nullable=False)  # OBLIGATOIRE
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    movement_type = Column(SAEnum(MovementType), nullable=False)
    quantity = Column(Integer, nullable=False)
    stock_before = Column(Integer, nullable=False)
    stock_after = Column(Integer, nullable=False)

    reason = Column(Text, nullable=True)
    reference_document = Column(String(200), nullable=True)  # bon de commande, etc.

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    product = relationship("Product", back_populates="movements")
    lot = relationship("ProductLot", back_populates="movements")
    user = relationship("User", back_populates="movements", foreign_keys=[user_id])


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    alert_type = Column(SAEnum(AlertType), nullable=False)
    status = Column(SAEnum(AlertStatus), default=AlertStatus.active, nullable=False)

    message = Column(Text, nullable=False)
    triggered_at = Column(DateTime(timezone=True), server_default=func.now())
    acknowledged_at = Column(DateTime(timezone=True), nullable=True)
    acknowledged_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    product = relationship("Product", back_populates="alerts")
    acknowledged_by = relationship("User", back_populates="acknowledged_alerts")