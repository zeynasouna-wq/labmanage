from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.models.models import Category
from app.modules.categories import repository
from app.modules.categories.schemas import CategoryCreate, CategoryUpdate


def get_categories(db: Session, skip: int = 0, limit: int = 10000) -> list[Category]:
    return repository.list_categories(db, skip=skip, limit=limit)


def get_category(db: Session, category_id: int) -> Category:
    category = repository.get_by_id(db, category_id)
    if not category:
        raise NotFoundError("Catégorie non trouvée")
    return category


def create_category(db: Session, data: CategoryCreate) -> Category:
    category = Category(
        name=data.name,
        description=data.description,
        color=data.color,
    )
    return repository.create(db, category)


def update_category(db: Session, category_id: int, data: CategoryUpdate) -> Category:
    category = get_category(db, category_id)

    if data.name is not None:
        category.name = data.name
    if data.description is not None:
        category.description = data.description
    if data.color is not None:
        category.color = data.color

    return repository.save(db, category)


def delete_category(db: Session, category_id: int) -> None:
    category = get_category(db, category_id)
    repository.delete(db, category)
