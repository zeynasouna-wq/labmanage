"""
API Router pour l'export de données
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse, StreamingResponse, Response
import io
import zipfile
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.models import User
from app.core.dependencies import get_current_user
from app.core.permissions import PermissionChecker, PermissionDenied
from app.services.csv_export_service import CSVExportService

router = APIRouter(prefix="/export", tags=["Export Données"])


@router.get("/csv/all", summary="Télécharger tous les enregistrements en ZIP-CSV")
def export_all_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Exporte tous les enregistrements en CSV dans un fichier ZIP.
    
    **Accessible UNIQUEMENT par les administrateurs**
    
    Inclut:
    - Produits
    - Mouvements de stock (historique)
    - Alertes
    - Utilisateurs
    - Fournisseurs
    - Localisations
    - Catégories
    - Lots de produits
    """
    # ✗ UNIQUEMENT admin peut exporter
    if not PermissionChecker.can_export_data(current_user):
        raise PermissionDenied("Seul un administrateur peut exporter les données")
    
    try:
        zip_content = CSVExportService.create_zip_export(db)
        
        return Response(
            content=zip_content,
            media_type="application/zip",
            headers={
                "Content-Disposition": "attachment; filename=labmanage_export.zip"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'export: {str(e)}")


@router.get("/csv/products", summary="Télécharger les produits en CSV")
def export_products_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Exporte la liste des produits en CSV"""
    if not PermissionChecker.can_export_data(current_user):
        raise PermissionDenied("Seul un administrateur peut exporter les données")
    
    try:
        csv_content = CSVExportService.export_products(db)
        
        return Response(
            content=csv_content.encode('utf-8'),
            media_type="text/csv",
            headers={
                "Content-Disposition": "attachment; filename=produits.csv"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'export: {str(e)}")


@router.get("/csv/movements", summary="Télécharger l'historique des mouvements en CSV")
def export_movements_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Exporte l'historique complet des mouvements de stock en CSV"""
    if not PermissionChecker.can_export_data(current_user):
        raise PermissionDenied("Seul un administrateur peut exporter les données")
    
    try:
        csv_content = CSVExportService.export_movements(db)
        
        return Response(
            content=csv_content.encode('utf-8'),
            media_type="text/csv",
            headers={
                "Content-Disposition": "attachment; filename=mouvements_stock.csv"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'export: {str(e)}")


@router.get("/csv/alerts", summary="Télécharger les alertes en CSV")
def export_alerts_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Exporte toutes les alertes en CSV"""
    if not PermissionChecker.can_export_data(current_user):
        raise PermissionDenied("Seul un administrateur peut exporter les données")
    
    try:
        csv_content = CSVExportService.export_alerts(db)
        
        return StreamingResponse(
            iter([csv_content]),
            media_type="text/csv",
            headers={
                "Content-Disposition": "attachment; filename=alertes.csv"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'export: {str(e)}")


@router.get("/csv/users", summary="Télécharger les utilisateurs en CSV")
def export_users_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Exporte la liste des utilisateurs en CSV"""
    if not PermissionChecker.can_export_data(current_user):
        raise PermissionDenied("Seul un administrateur peut exporter les données")
    
    try:
        csv_content = CSVExportService.export_users(db)
        
        return StreamingResponse(
            iter([csv_content]),
            media_type="text/csv",
            headers={
                "Content-Disposition": "attachment; filename=utilisateurs.csv"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'export: {str(e)}")


@router.get("/csv/suppliers", summary="Télécharger les fournisseurs en CSV")
def export_suppliers_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Exporte la liste des fournisseurs en CSV"""
    if not PermissionChecker.can_export_data(current_user):
        raise PermissionDenied("Seul un administrateur peut exporter les données")
    
    try:
        csv_content = CSVExportService.export_suppliers(db)
        
        return StreamingResponse(
            iter([csv_content]),
            media_type="text/csv",
            headers={
                "Content-Disposition": "attachment; filename=fournisseurs.csv"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'export: {str(e)}")


@router.get("/csv/locations", summary="Télécharger les localisations en CSV")
def export_locations_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Exporte la liste des localisations en CSV"""
    if not PermissionChecker.can_export_data(current_user):
        raise PermissionDenied("Seul un administrateur peut exporter les données")
    
    try:
        csv_content = CSVExportService.export_locations(db)
        
        return StreamingResponse(
            iter([csv_content]),
            media_type="text/csv",
            headers={
                "Content-Disposition": "attachment; filename=localisations.csv"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'export: {str(e)}")


@router.get("/csv/categories", summary="Télécharger les catégories en CSV")
def export_categories_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Exporte la liste des catégories en CSV"""
    if not PermissionChecker.can_export_data(current_user):
        raise PermissionDenied("Seul un administrateur peut exporter les données")
    
    try:
        csv_content = CSVExportService.export_categories(db)
        
        return StreamingResponse(
            iter([csv_content]),
            media_type="text/csv",
            headers={
                "Content-Disposition": "attachment; filename=categories.csv"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'export: {str(e)}")


@router.get("/csv/lots", summary="Télécharger les lots de produits en CSV")
def export_lots_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Exporte la liste des lots de produits en CSV"""
    if not PermissionChecker.can_export_data(current_user):
        raise PermissionDenied("Seul un administrateur peut exporter les données")
    
    try:
        csv_content = CSVExportService.export_product_lots(db)
        
        return StreamingResponse(
            iter([csv_content]),
            media_type="text/csv",
            headers={
                "Content-Disposition": "attachment; filename=lots_produits.csv"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'export: {str(e)}")
