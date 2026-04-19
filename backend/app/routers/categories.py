from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.models import User, Category
from app.core.dependencies import get_current_user, require_admin
from app.core.permissions import PermissionChecker, PermissionDenied
from app.schemas.schemas import CategoryCreate, CategoryUpdate, CategoryResponse
from sqlalchemy import select

router = APIRouter(prefix="/categories", tags=["Catégories"])


@router.get("/", response_model=list[CategoryResponse], summary="Lister les catégories")
def list_categories(
    skip: int = Query(0, ge=0),
    limit: int = Query(10000, le=50000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lister toutes les catégories - accès pour tous"""
    if not PermissionChecker.can_list_categories(current_user):
        raise PermissionDenied("Accès refusé")
    
    categories = db.query(Category).offset(skip).limit(limit).all()
    return categories


@router.post("/", response_model=CategoryResponse, status_code=201, summary="Créer une catégorie")
def create_category(
    data: CategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Créer une nouvelle catégorie - UNIQUEMENT admin"""
    if not PermissionChecker.can_create_category(current_user):
        raise PermissionDenied("Seul un administrateur peut créer des catégories")
    
    category = Category(
        name=data.name,
        description=data.description,
        color=data.color,
    )
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


@router.get("/{category_id}", response_model=CategoryResponse, summary="Détail catégorie")
def get_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Récupérer les détails d'une catégorie - accès pour tous"""
    if not PermissionChecker.can_view_category(current_user):
        raise PermissionDenied("Accès refusé")
    
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Catégorie non trouvée")
    return category


@router.patch("/{category_id}", response_model=CategoryResponse, summary="Modifier une catégorie")
def update_category(
    category_id: int,
    data: CategoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Modifier une catégorie - UNIQUEMENT admin"""
    if not PermissionChecker.can_update_category(current_user):
        raise PermissionDenied("Seul un administrateur peut modifier les catégories")
    
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Catégorie non trouvée")
    
    if data.name is not None:
        category.name = data.name
    if data.description is not None:
        category.description = data.description
    if data.color is not None:
        category.color = data.color
    
    db.commit()
    db.refresh(category)
    return category


@router.delete("/{category_id}", status_code=204, summary="Supprimer une catégorie")
def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Supprimer une catégorie - Techniciens et admins"""
    if not PermissionChecker.can_delete_category(current_user):
        raise PermissionDenied("Seuls les techniciens et administrateurs peuvent supprimer les catégories")
    
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Catégorie non trouvée")
    
    db.delete(category)
    db.commit()
