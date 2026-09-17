from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError, ValidationAppError
from app.models.models import Supplier
from app.modules.suppliers import repository
from app.modules.suppliers.schemas import SupplierCreate, SupplierUpdate


def get_suppliers(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    search: str | None = None,
) -> tuple[list[Supplier], int]:
    return repository.list_suppliers(db, skip=skip, limit=limit, search=search)


def get_supplier(db: Session, supplier_id: int) -> Supplier:
    supplier = repository.get_by_id(db, supplier_id)
    if not supplier:
        raise NotFoundError("Fournisseur introuvable")
    return supplier


def create_supplier(db: Session, data: SupplierCreate) -> Supplier:
    # Check if supplier with same name already exists
    if repository.get_by_name(db, data.name):
        raise ValidationAppError("Un fournisseur avec ce nom existe déjà")

    supplier = Supplier(**data.model_dump())
    return repository.create(db, supplier)


def update_supplier(db: Session, supplier_id: int, data: SupplierUpdate) -> Supplier:
    supplier = get_supplier(db, supplier_id)

    # Check if new name conflicts with another supplier
    if data.name and data.name != supplier.name:
        if repository.get_by_name(db, data.name):
            raise ValidationAppError("Un fournisseur avec ce nom existe déjà")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(supplier, field, value)
    return repository.save(db, supplier)


def delete_supplier(db: Session, supplier_id: int) -> None:
    supplier = get_supplier(db, supplier_id)

    # Check if supplier has products
    if supplier.products:
        raise ValidationAppError(
            f"Cannot delete supplier with {len(supplier.products)} product(s). Remove products first."
        )

    repository.delete(db, supplier)
