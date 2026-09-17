/**
 * Index des composants et utilitaires RBAC
 * Réexporte tout pour un accès facile
 */

// Permission Service
export { PermissionService, ROLES, type UserRole } from '@/lib/permissions';

// Navigation
export {
  NavigationService,
  PAGE_CONFIG,
  ROLE_MODULE_ACCESS,
  type PageConfig,
  type RoleModuleAccess,
} from '@/lib/navigation';

// Components
export {
  RoleGuard,
  PermissionGuard,
  RoleProtectedAction,
  RoleBased,
} from '@/components/RoleGuard';

export {
  ProtectedActionButton,
  ProtectedActionGrid,
  ProtectedField,
  ProtectedSection,
  UnauthorizedMessage,
} from '@/components/ProtectedActions';

export {
  RoleProtectedPage,
  RequireAuth,
  usePageAccess,
} from '@/components/RoleProtectedPage';

export {
  MainNav,
  SecondaryNav,
} from '@/components/Navigation';
