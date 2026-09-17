'use client';

import { ReactNode } from 'react';
import { UserRole, PermissionService } from '../lib/permissions';

interface RoleGuardProps {
  children: ReactNode;
  role: UserRole | null;
  requiredRoles: UserRole[];
  fallback?: ReactNode;
}

/**
 * Composant RoleGuard pour masquer/afficher du contenu selon les rôles
 * 
 * Exemple:
 * <RoleGuard role={userRole} requiredRoles={['admin']}>
 *   <AdminPanel />
 * </RoleGuard>
 */
export function RoleGuard({ 
  children, 
  role, 
  requiredRoles, 
  fallback = null 
}: RoleGuardProps) {
  const hasAccess = requiredRoles.includes(role as UserRole);
  
  if (!hasAccess) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
}

interface PermissionGuardProps {
  children: ReactNode;
  permission: (role: UserRole | null) => boolean;
  role: UserRole | null;
  fallback?: ReactNode;
}

/**
 * Composant PermissionGuard pour des vérifications de permissions plus complexes
 * 
 * Exemple:
 * <PermissionGuard role={userRole} permission={PermissionService.canUpdateProduct}>
 *   <EditButton />
 * </PermissionGuard>
 */
export function PermissionGuard({
  children,
  permission,
  role,
  fallback = null,
}: PermissionGuardProps) {
  const hasPermission = permission(role);
  
  if (!hasPermission) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
}

interface RoleProtectedActionProps {
  children: ReactNode;
  role: UserRole | null;
  permission: (role: UserRole | null) => boolean;
  disabledMessage?: string;
}

/**
 * Composant pour masquer ou désactiver des actions selon les permissions
 * Utile pour les boutons, formulaires, etc.
 */
export function RoleProtectedAction({
  children,
  role,
  permission,
  disabledMessage = 'Vous n\'avez pas les permissions pour effectuer cette action',
}: RoleProtectedActionProps) {
  const hasPermission = permission(role);
  
  // Si pas de permission, retourner null (masquer complètement)
  if (!hasPermission) {
    return null;
  }
  
  return <>{children}</>;
}

interface RoleBasedProps {
  role: UserRole | null;
  admin?: ReactNode;
  technician?: ReactNode;
  viewer?: ReactNode;
  fallback?: ReactNode;
}

/**
 * Composant pour afficher du contenu différent selon le rôle
 * 
 * Exemple:
 * <RoleBased role={userRole} admin={<AdminView />} technician={<TechView />} viewer={<ViewerView />} />
 */
export function RoleBased({
  role,
  admin,
  technician,
  viewer,
  fallback,
}: RoleBasedProps) {
  switch (role) {
    case 'admin':
      return <>{admin}</>;
    case 'technician':
      return <>{technician}</>;
    case 'viewer':
      return <>{viewer}</>;
    default:
      return <>{fallback}</>;
  }
}
