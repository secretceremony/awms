export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'READ_ONLY' | 'ADMIN_LOGISTICS' | 'USER';

export type PermissionCapability =
  | 'view_dashboard'
  | 'view_inventory'
  | 'view_movements'
  | 'view_deliveries'
  | 'view_master_data'
  | 'manage_inventory'
  | 'manage_movements'
  | 'manage_deliveries'
  | 'manage_master_data'
  | 'manage_settings'
  | 'view_audit_logs'
  | 'manage_users';

const ROLE_PERMISSIONS: Record<UserRole, PermissionCapability[]> = {
  SUPER_ADMIN: [
    'view_dashboard',
    'view_inventory',
    'view_movements',
    'view_deliveries',
    'view_master_data',
    'manage_inventory',
    'manage_movements',
    'manage_deliveries',
    'manage_master_data',
    'manage_settings',
    'view_audit_logs',
    'manage_users',
  ],
  ADMIN: [
    'view_dashboard',
    'view_inventory',
    'view_movements',
    'view_deliveries',
    'view_master_data',
    'manage_inventory',
    'manage_movements',
    'manage_deliveries',
    'manage_master_data',
  ],
  READ_ONLY: [
    'view_dashboard',
    'view_inventory',
    'view_movements',
    'view_deliveries',
    'view_master_data',
  ],
  // Backwards compatibility mappings
  ADMIN_LOGISTICS: [
    'view_dashboard',
    'view_inventory',
    'view_movements',
    'view_deliveries',
    'view_master_data',
    'manage_inventory',
    'manage_movements',
    'manage_deliveries',
    'manage_master_data',
    'manage_settings',
    'view_audit_logs',
    'manage_users',
  ],
  USER: [
    'view_dashboard',
    'view_inventory',
    'view_movements',
    'view_deliveries',
    'view_master_data',
  ],
};

export const hasPermission = (
  role: string | undefined | null,
  capability: PermissionCapability,
): boolean => {
  const normalizedRole = (role?.toUpperCase() || 'READ_ONLY') as UserRole;
  const allowed = ROLE_PERMISSIONS[normalizedRole] || ROLE_PERMISSIONS.READ_ONLY;
  return allowed.includes(capability);
};

export const canViewDashboard = (role: string | undefined | null): boolean =>
  hasPermission(role, 'view_dashboard');

export const canViewInventory = (role: string | undefined | null): boolean =>
  hasPermission(role, 'view_inventory');

export const canViewMovements = (role: string | undefined | null): boolean =>
  hasPermission(role, 'view_movements');

export const canViewDeliveries = (role: string | undefined | null): boolean =>
  hasPermission(role, 'view_deliveries');

export const canViewMasterData = (role: string | undefined | null): boolean =>
  hasPermission(role, 'view_master_data');

export const canManageInventory = (role: string | undefined | null): boolean =>
  hasPermission(role, 'manage_inventory');

export const canManageMovements = (role: string | undefined | null): boolean =>
  hasPermission(role, 'manage_movements');

export const canManageDeliveries = (role: string | undefined | null): boolean =>
  hasPermission(role, 'manage_deliveries');

export const canManageMasterData = (role: string | undefined | null): boolean =>
  hasPermission(role, 'manage_master_data');

export const canAccessSettings = (role: string | undefined | null): boolean =>
  hasPermission(role, 'manage_settings');

export const canAccessLogs = (role: string | undefined | null): boolean =>
  hasPermission(role, 'view_audit_logs');

export const canManageUsers = (role: string | undefined | null): boolean =>
  hasPermission(role, 'manage_users');

export const isReadOnly = (role: string | undefined | null): boolean =>
  (role?.toUpperCase() === 'READ_ONLY');


