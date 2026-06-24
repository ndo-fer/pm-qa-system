export const PERMISSIONS = [
  "projects:create",
  "projects:read",
  "projects:update",
  "projects:delete",
  "tasks:create",
  "tasks:read",
  "tasks:update",
  "tasks:delete",
  "qa:create",
  "qa:read",
  "qa:update",
  "qa:delete",
  "users:create",
  "users:read",
  "users:update",
  "users:delete",
] as const;

export type Permission = typeof PERMISSIONS[number];

export const ROLE_DEFAULT_PERMISSIONS: Record<string, Permission[]> = {
  admin: [...PERMISSIONS], // Admin has all permissions
  pm: [
    "projects:read",
    "projects:update",
    "tasks:create",
    "tasks:read",
    "tasks:update",
    "tasks:delete",
    "qa:read",
    "users:read",
  ],
  developer: [
    "projects:read",
    "tasks:read",
    "tasks:update",
    "qa:read",
  ],
  qa: [
    "projects:read",
    "tasks:read",
    "qa:create",
    "qa:read",
    "qa:update",
    "qa:delete",
  ],
};

export function hasPermission(
  userRole: string,
  userPermissions: string[] | null | undefined,
  requiredPermission: Permission
): boolean {
  // If user has specific overrides, check those
  if (userPermissions && userPermissions.length > 0) {
    return userPermissions.includes(requiredPermission);
  }
  
  // Otherwise, fallback to role defaults
  const defaults = ROLE_DEFAULT_PERMISSIONS[userRole] || [];
  return defaults.includes(requiredPermission);
}
