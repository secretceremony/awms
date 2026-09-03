export type UserRole = 'ADMIN_LOGISTICS' | 'USER';

export type PermissionCapability =
  | 'view_dashboard'
  | 'manage_inventory'
  | 'manage_movements'
  | 'manage_deliveries'
  | 'manage_master_data'
  | 'manage_settings'
  | 'view_audit_logs';

const ROLE_PERMISSIONS: Record<UserRole, PermissionCapability[]> = {
  ADMIN_LOGISTICS: [
    'view_dashboard',
    'manage_inventory',
    'manage_movements',
    'manage_deliveries',
    'manage_master_data',
    'manage_settings',
    'view_audit_logs',
  ],
  USER: [
    'view_dashboard',
    'manage_inventory',
    'manage_movements',
    'manage_deliveries',
    'manage_master_data',
  ],
};

export const hasPermission = (
  role: string | undefined | null,
  capability: PermissionCapability,
): boolean => {
  const normalizedRole = (role?.toUpperCase() || 'USER') as UserRole;
  const allowed = ROLE_PERMISSIONS[normalizedRole] || ROLE_PERMISSIONS.USER;
  return allowed.includes(capability);
};

export const canAccessSettings = (role: string | undefined | null): boolean =>
  hasPermission(role, 'manage_settings');

export const canAccessLogs = (role: string | undefined | null): boolean =>
  hasPermission(role, 'view_audit_logs');
