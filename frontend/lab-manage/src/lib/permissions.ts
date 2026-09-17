/**
 * Utilitaires pour gérer les permissions basées sur les rôles (RBAC)
 */

export type UserRole = 'admin' | 'technician' | 'viewer';

export const ROLES = {
  ADMIN: 'admin' as const,
  TECHNICIAN: 'technician' as const,
  VIEWER: 'viewer' as const,
};

/**
 * Vérifications de permissions centralisées côté frontend
 * IMPORTANT: Le backend doit TOUJOURS vérifier aussi les permissions!
 * Ces vérifications sont uniquement pour l'UX/masquage d'éléments
 */
export const PermissionService = {
  // ─── Rôles ───────────────────────────────────────────────────────

  isAdmin: (role: UserRole | null): boolean => {
    return role === ROLES.ADMIN;
  },

  isTechnician: (role: UserRole | null): boolean => {
    return role === ROLES.TECHNICIAN;
  },

  isViewer: (role: UserRole | null): boolean => {
    return role === ROLES.VIEWER;
  },

  isAdminOrTechnician: (role: UserRole | null): boolean => {
    return role === ROLES.ADMIN || role === ROLES.TECHNICIAN;
  },

  // ─── Produits ────────────────────────────────────────────────────

  canCreateProduct: (role: UserRole | null): boolean => {
    // Admin et technicien peuvent créer
    return role === ROLES.ADMIN || role === ROLES.TECHNICIAN;
  },

  canUpdateProduct: (role: UserRole | null): boolean => {
    // UNIQUEMENT admin peut modifier
    return role === ROLES.ADMIN;
  },

  canDeleteProduct: (role: UserRole | null): boolean => {
    // UNIQUEMENT admin peut supprimer
    return role === ROLES.ADMIN;
  },

  canListProducts: (role: UserRole | null): boolean => {
    // Tous peuvent voir les produits
    return true;
  },

  canViewProduct: (role: UserRole | null): boolean => {
    // Tous peuvent voir les détails
    return true;
  },

  // ─── Mouvements ──────────────────────────────────────────────────

  canCreateMovement: (role: UserRole | null): boolean => {
    // Admin et technicien peuvent créer
    return role === ROLES.ADMIN || role === ROLES.TECHNICIAN;
  },

  canDeleteMovement: (role: UserRole | null): boolean => {
    // Admin et technicien peuvent supprimer
    return role === ROLES.ADMIN || role === ROLES.TECHNICIAN;
  },

  canListMovements: (role: UserRole | null): boolean => {
    // Tous peuvent voir
    return true;
  },

  canViewMovement: (role: UserRole | null): boolean => {
    // Tous peuvent voir
    return true;
  },

  // ─── Fournisseurs ────────────────────────────────────────────────

  canListSuppliers: (role: UserRole | null): boolean => {
    // Tous peuvent consulter
    return true;
  },

  canViewSupplier: (role: UserRole | null): boolean => {
    // Tous peuvent consulter
    return true;
  },

  canCreateSupplier: (role: UserRole | null): boolean => {
    // UNIQUEMENT admin
    return role === ROLES.ADMIN;
  },

  canUpdateSupplier: (role: UserRole | null): boolean => {
    // UNIQUEMENT admin
    return role === ROLES.ADMIN;
  },

  canDeleteSupplier: (role: UserRole | null): boolean => {
    // UNIQUEMENT admin
    return role === ROLES.ADMIN;
  },

  // ─── Utilisateurs ────────────────────────────────────────────────

  canListUsers: (role: UserRole | null): boolean => {
    // UNIQUEMENT admin
    return role === ROLES.ADMIN;
  },

  canViewUser: (role: UserRole | null): boolean => {
    // Admin peut voir tous, autres ne peuvent voir que leur profil (vérification côté route)
    return role === ROLES.ADMIN;
  },

  canCreateUser: (role: UserRole | null): boolean => {
    // UNIQUEMENT admin
    return role === ROLES.ADMIN;
  },

  canUpdateUser: (role: UserRole | null): boolean => {
    // UNIQUEMENT admin
    return role === ROLES.ADMIN;
  },

  canDeleteUser: (role: UserRole | null): boolean => {
    // UNIQUEMENT admin
    return role === ROLES.ADMIN;
  },

  canToggleUserStatus: (role: UserRole | null): boolean => {
    // UNIQUEMENT admin
    return role === ROLES.ADMIN;
  },

  // ─── Catégories ──────────────────────────────────────────────────

  canListCategories: (role: UserRole | null): boolean => {
    // Tous peuvent voir
    return true;
  },

  canViewCategory: (role: UserRole | null): boolean => {
    // Tous peuvent voir
    return true;
  },

  canCreateCategory: (role: UserRole | null): boolean => {
    // UNIQUEMENT admin
    return role === ROLES.ADMIN;
  },

  canUpdateCategory: (role: UserRole | null): boolean => {
    // UNIQUEMENT admin
    return role === ROLES.ADMIN;
  },

  canDeleteCategory: (role: UserRole | null): boolean => {
    // UNIQUEMENT admin
    return role === ROLES.ADMIN;
  },

  // ─── Localisations ───────────────────────────────────────────────

  canListLocations: (role: UserRole | null): boolean => {
    // Tous peuvent voir
    return true;
  },

  canViewLocation: (role: UserRole | null): boolean => {
    // Tous peuvent voir
    return true;
  },

  canCreateLocation: (role: UserRole | null): boolean => {
    // UNIQUEMENT admin
    return role === ROLES.ADMIN;
  },

  canUpdateLocation: (role: UserRole | null): boolean => {
    // UNIQUEMENT admin
    return role === ROLES.ADMIN;
  },

  canDeleteLocation: (role: UserRole | null): boolean => {
    // UNIQUEMENT admin
    return role === ROLES.ADMIN;
  },

  // ─── Export ──────────────────────────────────────────────────────

  canExportData: (role: UserRole | null): boolean => {
    // UNIQUEMENT admin
    return role === ROLES.ADMIN;
  },

  // ─── Alertes ─────────────────────────────────────────────────────

  canListAlerts: (role: UserRole | null): boolean => {
    // Tous peuvent voir
    return true;
  },

  canAcknowledgeAlert: (role: UserRole | null): boolean => {
    // Admin et technicien peuvent marquer comme traité
    return role === ROLES.ADMIN || role === ROLES.TECHNICIAN;
  },
};
