'use client';

import { UserRole, PermissionService } from '@/lib/permissions';
import Link from 'next/link';
import { NavigationService } from '@/lib/navigation';

interface MainNavProps {
  role: UserRole | null;
  currentPath: string;
}

/**
 * Composant de navigation principale
 * Affiche uniquement les liens accessibles selon le rôle
 */
export function MainNav({ role, currentPath }: MainNavProps) {
  const pages = NavigationService.getMainNavPages(role);

  if (!role) {
    return null;
  }

  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <h1 className="text-xl font-bold">LabManage</h1>
            <span className="ml-4 px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm capitalize">
              {role === 'technician' ? 'Technicien' : role === 'viewer' ? 'Lecteur' : 'Administrateur'}
            </span>
          </div>

          <div className="flex space-x-4">
            {pages.map((page) => (
              <Link
                key={page.path}
                href={page.path}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  currentPath === page.path
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {page.icon ? `${page.icon} ` : ''} {page.label}
              </Link>
            ))}
          </div>

          <div>
            <button className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">
              Déconnexion
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

interface SecondaryNavProps {
  role: UserRole | null;
  currentPath: string;
}

/**
 * Navigation secondaire pour les sections
 */
export function SecondaryNav({ role, currentPath }: SecondaryNavProps) {
  if (!role) return null;

  const sections = [];

  // Section Produits
  if (PermissionService.canListProducts(role)) {
    sections.push({
      label: 'Produits',
      items: [
        { label: 'Liste', path: '/products' },
        PermissionService.canCreateProduct(role) && { label: 'Ajouter', path: '/products/new' },
      ].filter(Boolean),
    });
  }

  // Section Mouvements
  if (PermissionService.canListMovements(role)) {
    sections.push({
      label: 'Mouvements',
      items: [
        { label: 'Historique', path: '/movements' },
        PermissionService.canCreateMovement(role) && { label: 'Créer', path: '/movements/new' },
      ].filter(Boolean),
    });
  }

  // Section Fournisseurs (uniquement admin/technicien)
  if (PermissionService.canListSuppliers(role)) {
    sections.push({
      label: 'Fournisseurs',
      items: [
        { label: 'Liste', path: '/suppliers' },
        PermissionService.canCreateSupplier(role) && { label: 'Ajouter', path: '/suppliers/new' },
      ].filter(Boolean),
    });
  }

  // Section Administration (uniquement admin)
  if (PermissionService.isAdmin(role)) {
    sections.push({
      label: 'Administration',
      items: [
        { label: 'Utilisateurs', path: '/users' },
        { label: 'Paramètres', path: '/settings' },
        { label: 'Export', path: '/export' },
      ],
    });
  }

  return (
    <div className="bg-gray-50 border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {sections.map((section) => (
          <div key={section.label} className="py-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {section.label}
            </h3>
            <div className="flex space-x-3">
              {section.items.map((item: any) => (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`text-sm px-2 py-1 rounded ${
                    currentPath === item.path
                      ? 'bg-blue-100 text-blue-700 font-medium'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
