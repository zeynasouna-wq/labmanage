'use client';

import { ReactNode } from 'react';
import { UserRole, PermissionService } from '@/lib/permissions';

interface ProtectedActionButtonProps {
  role: UserRole | null;
  permission: (role: UserRole | null) => boolean;
  onClick?: () => void;
  className?: string;
  children: ReactNode;
  title?: string;
  disabledMessage?: string;
}

/**
 * Bouton qui est complètement masqué si l'utilisateur n'a pas les permissions
 * Utilisé pour les actions sensibles (edit, delete, create, etc.)
 */
export function ProtectedActionButton({
  role,
  permission,
  onClick,
  className = '',
  children,
  title,
  disabledMessage,
}: ProtectedActionButtonProps) {
  const hasPermission = permission(role);

  // Masquer complètement le bouton si pas de permission
  if (!hasPermission) {
    return null;
  }

  return (
    <button
      onClick={onClick}
      title={title}
      className={`px-3 py-2 rounded font-medium transition ${className}`}
    >
      {children}
    </button>
  );
}

interface ProtectedActionGridProps {
  role: UserRole | null;
  actions: Array<{
    label: string;
    permission: (role: UserRole | null) => boolean;
    onClick?: () => void;
    variant?: 'primary' | 'secondary' | 'danger' | 'success';
    icon?: string;
  }>;
  className?: string;
}

/**
 * Grille d'actions protégées par permissions
 * Affiche uniquement les actions autorisées
 */
export function ProtectedActionGrid({ role, actions, className = '' }: ProtectedActionGridProps) {
  const allowedActions = actions.filter((action) => action.permission(role));

  if (allowedActions.length === 0) {
    return null;
  }

  const getVariantClasses = (variant?: string) => {
    switch (variant) {
      case 'danger':
        return 'bg-red-500 hover:bg-red-600 text-white';
      case 'success':
        return 'bg-green-500 hover:bg-green-600 text-white';
      case 'secondary':
        return 'bg-gray-400 hover:bg-gray-500 text-white';
      default:
        return 'bg-blue-500 hover:bg-blue-600 text-white';
    }
  };

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {allowedActions.map((action, idx) => (
        <button
          key={idx}
          onClick={action.onClick}
          className={`px-3 py-2 rounded font-medium transition ${getVariantClasses(action.variant)}`}
        >
          {action.icon ? `${action.icon} ` : ''} {action.label}
        </button>
      ))}
    </div>
  );
}

interface ProtectedFieldProps {
  role: UserRole | null;
  permission: (role: UserRole | null) => boolean;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Masquer/afficher un champ de formulaire selon les permissions
 */
export function ProtectedField({
  role,
  permission,
  children,
  fallback = <div className="text-gray-500 italic">Non modifiable</div>,
}: ProtectedFieldProps) {
  const hasPermission = permission(role);

  if (!hasPermission) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

interface ProtectedSectionProps {
  role: UserRole | null;
  permission: (role: UserRole | null) => boolean;
  title?: string;
  children: ReactNode;
  className?: string;
}

/**
 * Masquer/afficher une section entière selon les permissions
 */
export function ProtectedSection({
  role,
  permission,
  title,
  children,
  className = '',
}: ProtectedSectionProps) {
  const hasPermission = permission(role);

  if (!hasPermission) {
    return null;
  }

  return (
    <section className={className}>
      {title && <h2 className="text-lg font-semibold mb-4">{title}</h2>}
      {children}
    </section>
  );
}

interface UnauthorizedMessageProps {
  title?: string;
  message?: string;
}

/**
 * Message d'accès refusé
 */
export function UnauthorizedMessage({
  title = 'Accès refusé',
  message = 'Vous n\'avez pas les permissions pour accéder à cette ressource.',
}: UnauthorizedMessageProps) {
  return (
    <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
      <h3 className="text-lg font-semibold text-red-900 mb-2">{title}</h3>
      <p className="text-red-700">{message}</p>
    </div>
  );
}
