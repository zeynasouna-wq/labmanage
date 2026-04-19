"""
Service centralisé pour les permissions et contrôles d'accès basés sur les rôles (RBAC)
Gère les vérifications d'autorisation pour tous les rôles
"""

from fastapi import HTTPException, status
from app.models.models import User, UserRole


class PermissionDenied(HTTPException):
    """Exception levée quand un utilisateur n'a pas les permissions requises"""
    def __init__(self, detail: str = "Accès refusé"):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail
        )


class PermissionChecker:
    """Service centralisé de vérification des permissions"""

    # ─── Vérifications par rôle ───────────────────────────────────────────
    
    @staticmethod
    def is_admin(user: User) -> bool:
        """Vérifie si l'utilisateur est administrateur"""
        return user.role == UserRole.admin

    @staticmethod
    def is_technician(user: User) -> bool:
        """Vérifie si l'utilisateur est technicien"""
        return user.role == UserRole.technician

    @staticmethod
    def is_viewer(user: User) -> bool:
        """Vérifie si l'utilisateur est lecteur"""
        return user.role == UserRole.viewer

    @staticmethod
    def is_admin_or_technician(user: User) -> bool:
        """Vérifie si l'utilisateur est admin ou technicien"""
        return user.role in (UserRole.admin, UserRole.technician)

    # ─── Produits ────────────────────────────────────────────────────────

    @staticmethod
    def can_create_product(user: User) -> bool:
        """Techniciens et admins peuvent ajouter des produits"""
        return user.role in (UserRole.admin, UserRole.technician)

    @staticmethod
    def can_update_product(user: User) -> bool:
        """UNIQUEMENT les admins peuvent modifier les produits"""
        return user.role == UserRole.admin

    @staticmethod
    def can_delete_product(user: User) -> bool:
        """UNIQUEMENT les admins peuvent supprimer les produits"""
        return user.role == UserRole.admin

    @staticmethod
    def can_list_products(user: User) -> bool:
        """Tous peuvent voir la liste des produits"""
        return True

    @staticmethod
    def can_view_product(user: User) -> bool:
        """Tous peuvent voir les détails d'un produit"""
        return True

    # ─── Mouvements ──────────────────────────────────────────────────────

    @staticmethod
    def can_create_movement(user: User) -> bool:
        """Techniciens et admins peuvent créer des mouvements"""
        return user.role in (UserRole.admin, UserRole.technician)

    @staticmethod
    def can_delete_movement(user: User) -> bool:
        """Techniciens et admins peuvent supprimer des mouvements"""
        return user.role in (UserRole.admin, UserRole.technician)

    @staticmethod
    def can_list_movements(user: User) -> bool:
        """Tous peuvent voir l'historique des mouvements"""
        return True

    @staticmethod
    def can_view_movement(user: User) -> bool:
        """Tous peuvent voir les détails d'un mouvement"""
        return True

    # ─── Fournisseurs ────────────────────────────────────────────────────

    @staticmethod
    def can_list_suppliers(user: User) -> bool:
        """Tous peuvent voir la liste des fournisseurs (lecture seule)"""
        return True

    @staticmethod
    def can_view_supplier(user: User) -> bool:
        """Tous peuvent voir les détails d'un fournisseur (lecture seule)"""
        return True

    @staticmethod
    def can_create_supplier(user: User) -> bool:
        """UNIQUEMENT les admins peuvent créer des fournisseurs"""
        return user.role == UserRole.admin

    @staticmethod
    def can_update_supplier(user: User) -> bool:
        """UNIQUEMENT les admins peuvent modifier les fournisseurs"""
        return user.role == UserRole.admin

    @staticmethod
    def can_delete_supplier(user: User) -> bool:
        """UNIQUEMENT les admins peuvent supprimer les fournisseurs"""
        return user.role == UserRole.admin

    # ─── Utilisateurs ────────────────────────────────────────────────────

    @staticmethod
    def can_list_users(user: User) -> bool:
        """UNIQUEMENT les admins peuvent lister les utilisateurs"""
        return user.role == UserRole.admin

    @staticmethod
    def can_view_user(user: User, target_user_id: int) -> bool:
        """Les admins peuvent voir n'importe quel utilisateur, autres peuvent voir leur profil"""
        return user.role == UserRole.admin or user.id == target_user_id

    @staticmethod
    def can_create_user(user: User) -> bool:
        """UNIQUEMENT les admins peuvent créer des utilisateurs"""
        return user.role == UserRole.admin

    @staticmethod
    def can_update_user(user: User) -> bool:
        """UNIQUEMENT les admins peuvent modifier les utilisateurs"""
        return user.role == UserRole.admin

    @staticmethod
    def can_delete_user(user: User) -> bool:
        """UNIQUEMENT les admins peuvent supprimer les utilisateurs"""
        return user.role == UserRole.admin

    # ─── Catégories ──────────────────────────────────────────────────────

    @staticmethod
    def can_list_categories(user: User) -> bool:
        """Tous peuvent voir les catégories"""
        return True

    @staticmethod
    def can_view_category(user: User) -> bool:
        """Tous peuvent voir une catégorie"""
        return True

    @staticmethod
    def can_create_category(user: User) -> bool:
        """UNIQUEMENT les admins peuvent créer des catégories"""
        return user.role == UserRole.admin

    @staticmethod
    def can_update_category(user: User) -> bool:
        """UNIQUEMENT les admins peuvent modifier les catégories"""
        return user.role == UserRole.admin

    @staticmethod
    def can_delete_category(user: User) -> bool:
        """UNIQUEMENT les admins peuvent supprimer les catégories"""
        return user.role == UserRole.admin

    # ─── Localisations ───────────────────────────────────────────────────

    @staticmethod
    def can_list_locations(user: User) -> bool:
        """Tous peuvent voir les localisations"""
        return True

    @staticmethod
    def can_view_location(user: User) -> bool:
        """Tous peuvent voir une localisation"""
        return True

    @staticmethod
    def can_create_location(user: User) -> bool:
        """UNIQUEMENT les admins peuvent créer des localisations"""
        return user.role == UserRole.admin

    @staticmethod
    def can_update_location(user: User) -> bool:
        """UNIQUEMENT les admins peuvent modifier les localisations"""
        return user.role == UserRole.admin

    @staticmethod
    def can_delete_location(user: User) -> bool:
        """UNIQUEMENT les admins peuvent supprimer les localisations"""
        return user.role == UserRole.admin

    # ─── Export ──────────────────────────────────────────────────────────

    @staticmethod
    def can_export_data(user: User) -> bool:
        """UNIQUEMENT les admins peuvent exporter les données"""
        return user.role == UserRole.admin

    # ─── Alertes ─────────────────────────────────────────────────────────

    @staticmethod
    def can_list_alerts(user: User) -> bool:
        """Tous peuvent voir les alertes"""
        return True

    @staticmethod
    def can_acknowledge_alert(user: User) -> bool:
        """Admins et techniciens peuvent marquer les alertes comme traitées"""
        return user.role in (UserRole.admin, UserRole.technician)
