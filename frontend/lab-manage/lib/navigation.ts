'use client';

import { UserRole, PermissionService } from '@/lib/permissions';

export interface PageConfig {
  path: string;
  label: string;
  icon?: string;
  requiresAuth: boolean;
  allowedRoles: UserRole[];
}

/**
 * Configuration des pages et des permissions
 * Cette config centralisée facilite la gestion des accès
 */
export const PAGE_CONFIG: PageConfig[] = [
  // Pages publiques/auth
  {
    path: '/login',
    label: 'Connexion',
    requiresAuth: false,
    allowedRoles: ['admin', 'technician', 'viewer'],
  },

  // Lecteur (viewer) - Accès en lecture seule
  {
    path: '/products',
    label: 'Produits',
    icon: '📦',
    requiresAuth: true,
    allowedRoles: ['admin', 'technician', 'viewer'],
  },
  {
    path: '/movements',
    label: 'Mouvements',
    icon: '📊',
    requiresAuth: true,
    allowedRoles: ['admin', 'technician', 'viewer'],
  },

  // Technicien - Accès lecture + certaines écritures
  {
    path: '/movements/new',
    label: 'Nouveau Mouvement',
    icon: '➕',
    requiresAuth: true,
    allowedRoles: ['admin', 'technician'],
  },

  // Admin - Accès complet
  {
    path: '/suppliers',
    label: 'Fournisseurs',
    icon: '🏢',
    requiresAuth: true,
    allowedRoles: ['admin'],
  },
  {
    path: '/users',
    label: 'Utilisateurs',
    icon: '👥',
    requiresAuth: true,
    allowedRoles: ['admin'],
  },
  {
    path: '/settings',
    label: 'Paramètres',
    icon: '⚙️',
    requiresAuth: true,
    allowedRoles: ['admin'],
  },
  {
    path: '/export',
    label: 'Export',
    icon: '📥',
    requiresAuth: true,
    allowedRoles: ['admin'],
  },
];

/**
 * Service de navigation basé sur les rôles
 */
export const NavigationService = {
  /**
   * Obtenir les pages accessibles pour un rôle donné
   */
  getAccessiblePages: (role: UserRole | null): PageConfig[] => {
    if (!role) return [];
    return PAGE_CONFIG.filter((page) => page.allowedRoles.includes(role));
  },

  /**
   * Vérifier si une page est accessible pour un rôle
   */
  isPageAccessible: (path: string, role: UserRole | null): boolean => {
    if (!role) return false;
    const page = PAGE_CONFIG.find((p) => p.path === path);
    if (!page) return false;
    return page.allowedRoles.includes(role);
  },

  /**
   * Obtenir les pages visibles dans la navigation pour un rôle
   */
  getMainNavPages: (role: UserRole | null): PageConfig[] => {
    const accessible = NavigationService.getAccessiblePages(role);
    // Exclure certaines pages de la navigation principale
    return accessible.filter((p) => !p.path.includes('/new') && p.path !== '/login');
  },

  /**
   * Redirection automatique si l'utilisateur n'a pas accès
   */
  getDefaultPage: (role: UserRole | null): string => {
    if (!role) return '/login';
    
    const accessible = NavigationService.getAccessiblePages(role);
    if (accessible.length === 0) return '/login';
    
    // Retourner la première page accessible
    return accessible[0].path;
  },
};

/**
 * Configuration des sections/modules par rôle
 * Utilisé pour afficher/masquer des sections UI complètes
 */
export interface RoleModuleAccess {
  role: UserRole;
  modules: {
    productManagement: boolean;
    productEditing: boolean;
    movementTracking: boolean;
    movementCreation: boolean;
    supplierManagement: boolean;
    userManagement: boolean;
    exportData: boolean;
    settings: boolean;
    alerts: boolean;
  };
}

export const ROLE_MODULE_ACCESS: Record<UserRole, RoleModuleAccess['modules']> = {
  admin: {
    productManagement: true,
    productEditing: true,
    movementTracking: true,
    movementCreation: true,
    supplierManagement: true,
    userManagement: true,
    exportData: true,
    settings: true,
    alerts: true,
  },
  technician: {
    productManagement: true,
    productEditing: false, // Lecture seule
    movementTracking: true,
    movementCreation: true,
    supplierManagement: false, // Pas d'accès
    userManagement: false,
    exportData: false,
    settings: false,
    alerts: true,
  },
  viewer: {
    productManagement: true,
    productEditing: false,
    movementTracking: true,
    movementCreation: false,
    supplierManagement: false,
    userManagement: false,
    exportData: false,
    settings: false,
    alerts: true,
  },
};
