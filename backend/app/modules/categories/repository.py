from sqlalchemy.orm import Session

from app.models.models import Category


def get_by_id(db: Session, category_id: int) -> Category | None:
    return db.query(Category).filter(Category.id == category_id).first()


def list_categories(db: Session, skip: int = 0, limit: int = 10000) -> list[Category]:
    return db.query(Category).offset(skip).limit(limit).all()


def create(db: Session, category: Category) -> Category:
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


def save(db: Session, category: Category) -> Category:
    db.commit()
    db.refresh(category)
    return category


def delete(db: Session, category: Category) -> None:
    db.delete(category)
    db.commit()
