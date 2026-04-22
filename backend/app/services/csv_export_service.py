"""
Service d'export de données CSV
"""
import csv
import io
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.models import (
    Product, StockMovement, Alert, User, Supplier, 
    Location, Category, ProductLot
)


class CSVExportService:
    """Service pour exporter les données en format CSV"""

    @staticmethod
    def export_all_data(db: Session) -> dict[str, str]:
        """
        Exporte toutes les données en CSV (plusieurs fichiers)
        Retourne un dict avec clé = nom fichier, valeur = contenu CSV       
        """
        exports = {
            'products.csv': CSVExportService.export_products(db),
            'stock_movements.csv': CSVExportService.export_movements(db),
            'alerts.csv': CSVExportService.export_alerts(db),
            'users.csv': CSVExportService.export_users(db),
            'suppliers.csv': CSVExportService.export_suppliers(db),
            'locations.csv': CSVExportService.export_locations(db),
            'categories.csv': CSVExportService.export_categories(db),
            'product_lots.csv': CSVExportService.export_product_lots(db),
        }
        return exports

    @staticmethod
    def export_products(db: Session) -> str:
        products = db.query(Product).all()
        
        # Utiliser BytesIO avec TextIOWrapper pour contrôler l'encodage UTF-8
        output = io.BytesIO()
        wrapper = io.TextIOWrapper(output, encoding='utf-8', newline='')
        writer = csv.writer(wrapper)
        
        # Headers
        writer.writerow([
            'ID', 'Nom', 'Référence', 'Description', 
            'Stock Actuel', 'Stock Minimum', 'Stock Alerte',
            'Actif', 'Fournisseur', 'Localisation', 'Catégorie',
            'Date Création', 'Date Modification'
        ])
        
        # Data
        for product in products:
            writer.writerow([
                product.id,
                product.name,
                product.reference or '',
                product.description or '',
                product.current_stock,
                product.minimum_stock,
                product.alert_stock,
                'Oui' if product.is_active else 'Non',
                product.supplier.name if product.supplier else '',
                product.location.name if product.location else '',
                product.category.name if product.category else '',
                product.created_at.strftime('%Y-%m-%d %H:%M:%S') if product.created_at else '',
                product.updated_at.strftime('%Y-%m-%d %H:%M:%S') if product.updated_at else '',
            ])
        
        wrapper.flush()
        output.seek(0)
        return output.getvalue().decode('utf-8')

    @staticmethod
    def export_movements(db: Session) -> str:
        """Exporte l'historique des mouvements de stock"""
        movements = db.query(StockMovement).order_by(StockMovement.created_at.desc()).all()
        
        output = io.BytesIO()
        wrapper = io.TextIOWrapper(output, encoding='utf-8', newline='')
        writer = csv.writer(wrapper)
        
        # Headers
        writer.writerow([
            'ID', 'Produit', 'Type Mouvement', 'Quantité',
            'Stock Avant', 'Stock Après', 'Numéro Lot',
            'Raison', 'Document Référence',
            'Utilisateur', 'Date'
        ])
        
        # Data
        for movement in movements:
            writer.writerow([
                movement.id,
                movement.product.name if movement.product else '',
                movement.movement_type.value,
                movement.quantity,
                movement.stock_before,
                movement.stock_after,
                movement.lot.lot_number if movement.lot else '',
                movement.reason or '',
                movement.reference_document or '',
                movement.user.email if movement.user else '',
                movement.created_at.strftime('%Y-%m-%d %H:%M:%S') if movement.created_at else '',
            ])
        
        wrapper.flush()
        output.seek(0)
        return output.getvalue().decode('utf-8')

    @staticmethod
    def export_alerts(db: Session) -> str:
        """Exporte les alertes"""
        alerts = db.query(Alert).order_by(Alert.triggered_at.desc()).all()
        
        output = io.BytesIO()
        wrapper = io.TextIOWrapper(output, encoding='utf-8', newline='')
        writer = csv.writer(wrapper)
        
        # Headers
        writer.writerow([
            'ID', 'Produit', 'Type Alerte', 'Statut', 'Message',
            'Déclenché À', 'Reconnu À', 'Reconnu Par',
            'Résolu À'
        ])
        
        # Data
        for alert in alerts:
            writer.writerow([
                alert.id,
                alert.product.name if alert.product else '',
                alert.alert_type.value,
                alert.status.value,
                alert.message,
                alert.triggered_at.strftime('%Y-%m-%d %H:%M:%S') if alert.triggered_at else '',
                alert.acknowledged_at.strftime('%Y-%m-%d %H:%M:%S') if alert.acknowledged_at else '',
                alert.acknowledged_by.email if alert.acknowledged_by else '',
                alert.resolved_at.strftime('%Y-%m-%d %H:%M:%S') if alert.resolved_at else '',
            ])
        
        wrapper.flush()
        output.seek(0)
        return output.getvalue().decode('utf-8')

    @staticmethod
    def export_users(db: Session) -> str:
        """Exporte les utilisateurs"""
        users = db.query(User).all()
        
        output = io.BytesIO()
        wrapper = io.TextIOWrapper(output, encoding='utf-8', newline='')
        writer = csv.writer(wrapper)
        
        # Headers
        writer.writerow([
            'ID', 'Nom', 'Email', 'Rôle', 'Statut',
            'Actif', 'Dernière Connexion', 'Date Création'
        ])
        
        # Data
        for user in users:
            writer.writerow([
                user.id,
                user.name,
                user.email,
                user.role.value,
                user.status.value,
                'Oui' if user.is_active else 'Non',
                user.last_login.strftime('%Y-%m-%d %H:%M:%S') if user.last_login else '',
                user.created_at.strftime('%Y-%m-%d %H:%M:%S') if user.created_at else '',
            ])
        
        wrapper.flush()
        output.seek(0)
        return output.getvalue().decode('utf-8')

    @staticmethod
    def export_suppliers(db: Session) -> str:
        """Exporte les fournisseurs"""
        suppliers = db.query(Supplier).all()
        
        output = io.BytesIO()
        wrapper = io.TextIOWrapper(output, encoding='utf-8', newline='')
        writer = csv.writer(wrapper)
        
        # Headers
        writer.writerow([
            'ID', 'Nom', 'Contact', 'Email', 'Téléphone',
            'Adresse', 'Date Création'
        ])
        
        # Data
        for supplier in suppliers:
            writer.writerow([
                supplier.id,
                supplier.name,
                supplier.contact or '',
                supplier.email or '',
                supplier.phone or '',
                supplier.address or '',
                supplier.created_at.strftime('%Y-%m-%d %H:%M:%S') if supplier.created_at else '',
            ])
        
        wrapper.flush()
        output.seek(0)
        return output.getvalue().decode('utf-8')

    @staticmethod
    def export_locations(db: Session) -> str:
        """Exporte les localisations"""
        locations = db.query(Location).all()
        
        output = io.BytesIO()
        wrapper = io.TextIOWrapper(output, encoding='utf-8', newline='')
        writer = csv.writer(wrapper)
        
        # Headers
        writer.writerow([
            'ID', 'Nom', 'Description', 'Contrôle Température'
        ])
        
        # Data
        for location in locations:
            writer.writerow([
                location.id,
                location.name,
                location.description or '',
                'Oui' if location.temperature_controlled else 'Non',
            ])
        
        wrapper.flush()
        output.seek(0)
        return output.getvalue().decode('utf-8')

    @staticmethod
    def export_categories(db: Session) -> str:
        """Exporte les catégories"""
        categories = db.query(Category).all()
        
        output = io.BytesIO()
        wrapper = io.TextIOWrapper(output, encoding='utf-8', newline='')
        writer = csv.writer(wrapper)
        
        # Headers
        writer.writerow([
            'ID', 'Nom', 'Description', 'Couleur'
        ])
        
        # Data
        for category in categories:
            writer.writerow([
                category.id,
                category.name,
                category.description or '',
                category.color or '',
            ])
        
        wrapper.flush()
        output.seek(0)
        return output.getvalue().decode('utf-8')

    @staticmethod
    def export_product_lots(db: Session) -> str:
        """Exporte les lots de produits"""
        lots = db.query(ProductLot).order_by(ProductLot.received_at.desc()).all()
        
        output = io.BytesIO()
        wrapper = io.TextIOWrapper(output, encoding='utf-8', newline='')
        writer = csv.writer(wrapper)
        
        # Headers
        writer.writerow([
            'ID', 'Produit', 'Numéro Lot', 'Quantité',
            'Date Expiration', 'Date Réception', 'Notes'
        ])
        
        # Data
        for lot in lots:
            writer.writerow([
                lot.id,
                lot.product.name if lot.product else '',
                lot.lot_number,
                lot.quantity,
                lot.expiry_date.strftime('%Y-%m-%d') if lot.expiry_date else '',
                lot.received_at.strftime('%Y-%m-%d %H:%M:%S') if lot.received_at else '',
                lot.notes or '',
            ])
        
        wrapper.flush()
        output.seek(0)
        return output.getvalue().decode('utf-8')

    @staticmethod
    def create_zip_export(db: Session) -> bytes:
        """
        Crée un fichier ZIP contenant tous les CSV avec encodage UTF-8
        """
        import zipfile
        
        exports = CSVExportService.export_all_data(db)
        
        # Créer un ZIP en mémoire
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            for filename, content in exports.items():
                # Ajouter chaque CSV au ZIP avec un timestamp
                # L'encodage UTF-8 est géré automatiquement par ZipFile
                name_without_ext = filename.replace('.csv', '')
                zip_filename = f"{timestamp}_{filename}"
                # content est une string en UTF-8, on l'encode explicitement
                zip_file.writestr(zip_filename, content.encode('utf-8'))
        
        zip_buffer.seek(0)
        return zip_buffer.getvalue()
