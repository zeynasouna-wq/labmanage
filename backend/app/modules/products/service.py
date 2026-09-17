from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, NotFoundError
from app.models.models import Product, ProductLot
from app.modules.categories import repository as categories_repository
from app.modules.locations import repository as locations_repository
from app.modules.products import repository
from app.modules.products.schemas import ProductCreate, ProductLotCreate, ProductUpdate
from app.modules.suppliers import repository as suppliers_repository


def _sync_stock(db: Session, product: Product) -> None:
    """Recompute and persist product.current_stock from its lots."""
    product.current_stock = sum(lot.quantity for lot in product.lots)


def get_products(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    search: str | None = None,
    supplier_id: int | None = None,
    location_id: int | None = None,
    category_id: int | None = None,
    is_active: bool | None = True,
) -> tuple[list[Product], int]:
    return repository.list_products(
        db,
        skip=skip,
        limit=limit,
        search=search,
        supplier_id=supplier_id,
        location_id=location_id,
        category_id=category_id,
        is_active=is_active,
    )


def get_product(db: Session, product_id: int) -> Product:
    product = repository.get_by_id(db, product_id)
    if not product:
        raise NotFoundError("Produit introuvable")
    return product


def create_product(db: Session, data: ProductCreate) -> Product:
    # Check reference uniqueness
    if repository.get_by_reference(db, data.reference):
        raise ConflictError(
            f"Un produit avec la référence '{data.reference}' existe déjà"
        )

    # Validate foreign keys
    if data.supplier_id and not suppliers_repository.get_by_id(db, data.supplier_id):
        raise NotFoundError("Fournisseur introuvable")
    if data.location_id and not locations_repository.get_by_id(db, data.location_id):
        raise NotFoundError("Emplacement introuvable")
    if data.category_id and not categories_repository.get_by_id(db, data.category_id):
        raise NotFoundError("Catégorie introuvable")

    lots_data = data.lots or []

    # Create product (current_stock defaults to 0)
    product_data = data.model_dump(exclude={"lots"})
    product = Product(**product_data)
    repository.create(db, product)  # obtains product.id via flush

    # Create initial lots
    for lot_data in lots_data:
        lot = ProductLot(product_id=product.id, **lot_data.model_dump())
        db.add(lot)

    db.flush()  # lots are now in the session

    # ── Sync current_stock from the lots just created ────────────────────────
    _sync_stock(db, product)
    # ────────────────────────────────────────────────────────────────────────

    return repository.save(db, product)


def update_product(db: Session, product_id: int, data: ProductUpdate) -> Product:
    product = get_product(db, product_id)
    update_data = data.model_dump(exclude_unset=True)

    # Check reference uniqueness on update
    if update_data.get("reference"):
        if repository.get_by_reference(
            db, update_data["reference"], exclude_id=product_id
        ):
            raise ConflictError(
                f"Un produit avec la référence '{update_data['reference']}' existe déjà"
            )

    for field, value in update_data.items():
        setattr(product, field, value)

    return repository.save(db, product)


def delete_product(db: Session, product_id: int) -> None:
    """
    Supprime complètement un produit de la base de données.

    Tous les éléments associés sont supprimés en cascade :
    - ProductLot (lots)
    - StockMovement (mouvements de stock)
    - Alert (alertes)
    """
    product = get_product(db, product_id)
    repository.delete(db, product)


def add_lot(db: Session, product_id: int, data: ProductLotCreate) -> ProductLot:
    product = get_product(db, product_id)
    lot = ProductLot(product_id=product_id, **data.model_dump())
    repository.create_lot(db, lot)

    repository.refresh(db, product)  # reload product.lots from the DB
    _sync_stock(db, product)

    repository.commit(db)
    repository.refresh(db, lot)
    return lot


def get_lots(db: Session, product_id: int) -> list[ProductLot]:
    return repository.get_lots(db, product_id)


def update_lot(
    db: Session, product_id: int, lot_id: int, data: ProductLotCreate
) -> ProductLot:
    product = get_product(db, product_id)
    lot = repository.get_lot_by_id(db, product_id, lot_id)
    if not lot:
        raise NotFoundError("Lot introuvable")

    lot.lot_number = data.lot_number
    lot.quantity = data.quantity
    lot.expiry_date = data.expiry_date
    lot.notes = data.notes

    db.flush()

    repository.refresh(db, product)  # même fix
    _sync_stock(db, product)

    repository.commit(db)
    repository.refresh(db, lot)
    return lot


def delete_lot(db: Session, product_id: int, lot_id: int) -> None:
    product = get_product(db, product_id)
    lot = repository.get_lot_by_id(db, product_id, lot_id)
    if not lot:
        raise NotFoundError("Lot introuvable")

    repository.delete_lot(db, lot)

    repository.refresh(db, product)  # recharge product.lots depuis la DB
    _sync_stock(db, product)  # même fonction que partout ailleurs

    repository.commit(db)
