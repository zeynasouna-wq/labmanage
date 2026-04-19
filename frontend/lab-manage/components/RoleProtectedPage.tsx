'use client';

import { ReactNode } from 'react';
import { UserRole } from '@/lib/permissions';
import { NavigationService } from '@/lib/navigation';
import { UnauthorizedMessage } from './ProtectedActions';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface RoleProtectedPageProps {
  role: UserRole | null;
  requiredRoles: UserRole[];
  children: ReactNode;
  showUnauthorized?: boolean;
  redirectTo?: string;
}

/**
 * Composant pour protéger une page entière selon le rôle
 * Peut rediriger ou afficher un message non autorisé
 */
export function RoleProtectedPage({
  role,
  requiredRoles,
  children,
  showUnauthorized = true,
  redirectTo,
}: RoleProtectedPageProps) {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    // Si pas d'authentification, rediriger vers login
    if (!role) {
      router.push('/login');
      return;
    }

    // Vérifier les rôles requis
    const hasAccess = requiredRoles.includes(role);
    if (!hasAccess && redirectTo) {
      router.push(redirectTo);
    }
  }, [role, redirectTo, router, requiredRoles]);

  if (!isClient) {
    return <div>Chargement...</div>;
  }

  // Pas authentifié
  if (!role) {
    return showUnauthorized ? (
      <UnauthorizedMessage
        title="Authentification requise"
        message="Veuillez vous connecter pour accéder à cette page."
      />
    ) : null;
  }

  // Pas les permissions
  const hasAccess = requiredRoles.includes(role);
  if (!hasAccess) {
    if (redirectTo) {
      // La redirection est gérée dans useEffect
      return null;
    }
    return showUnauthorized ? (
      <UnauthorizedMessage
        title="Accès refusé"
        message={`Vous devez avoir le rôle de ${requiredRoles.join(' ou ')} pour accéder à cette page.`}
      />
    ) : null;
  }

  return <>{children}</>;
}

interface RoleRouterGuardProps {
  role: UserRole | null;
  currentPath: string;
}

/**
 * Hook pour vérifier si la page courante est accessible
 */
export function usePageAccess(role: UserRole | null, path: string): boolean {
  return NavigationService.isPageAccessible(path, role);
}

/**
 * Wrapper pour les pages qui nécessitent une authentification
 */
export function RequireAuth({
  children,
  role,
}: {
  children: ReactNode;
  role: UserRole | null;
}) {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    if (!role) {
      router.push('/login');
    }
  }, [role, router]);

  if (!isClient) {
    return <div>Chargement...</div>;
  }

  if (!role) {
    return null;
  }

  return <>{children}</>;
}
