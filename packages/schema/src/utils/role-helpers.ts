import { role_kind_enum, type Role } from "../db-schema/role";

// Define specific permission types
export type AccountAction = "view_billing" | "manage_billing";

export type TenantAction =
  | "manage_users"
  | "manage_roles"
  | "manage_settings"
  | "view_analytics"
  | "manage_content";

export type Action = AccountAction | TenantAction;

// Default role configurations
export const DEFAULT_ROLES = {
  OWNER: {
    name: "Owner",
    description: "Full access to all tenant features",
    kind: "owner" as const,
    allowed: [
      "view_billing",
      "manage_billing",
      "manage_users",
      "manage_roles",
      "manage_settings",
      "view_analytics",
      "manage_content",
    ] as Action[],
  },
  BILLING_ADMIN: {
    name: "Billing Admin",
    description: "Can manage billing and payment information",
    kind: "billing_admin" as const,
    allowed: ["view_billing", "manage_billing"] as Action[],
  },
  TENANT_ADMIN: {
    name: "Tenant Admin",
    description: "Can manage tenant settings and users",
    kind: "tenant_admin" as const,
    allowed: [
      "view_billing",
      "manage_users",
      "manage_roles",
      "manage_settings",
      "view_analytics",
      "manage_content",
    ] as Action[],
  },
  USER: {
    name: "User",
    description: "Basic user access",
    kind: "user" as const,
    allowed: [] as Action[],
  },
} as const;

// Utility functions for working with roles and permissions

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: Role, action: Action): boolean {
  return role.allowed.includes(action);
}

/**
 * Check if a role has all of the specified permissions
 */
export function hasAllPermissions(role: Role, actions: Action[]): boolean {
  return actions.every((action) => hasPermission(role, action));
}

/**
 * Check if a role has any of the specified permissions
 */
export function hasAnyPermission(role: Role, actions: Action[]): boolean {
  return actions.some((action) => hasPermission(role, action));
}

/**
 * Get all permissions for a role kind
 */
export function getPermissionsForRoleKind(
  kind: (typeof role_kind_enum.enumValues)[number]
): Action[] {
  return DEFAULT_ROLES[kind.toUpperCase() as keyof typeof DEFAULT_ROLES]
    .allowed;
}

/**
 * Validate if a role configuration is valid
 */
export function validateRoleConfig(config: {
  name: string;
  description?: string;
  kind: (typeof role_kind_enum.enumValues)[number];
  allowed: Action[];
}): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate name
  if (!config.name.trim()) {
    errors.push("Role name is required");
  }

  // Validate kind
  if (!role_kind_enum.enumValues.includes(config.kind)) {
    errors.push(`Invalid role kind: ${config.kind}`);
  }

  // Validate allowed actions
  const defaultPermissions = getPermissionsForRoleKind(config.kind);
  const invalidActions = config.allowed.filter(
    (action) => !defaultPermissions.includes(action)
  );
  if (invalidActions.length > 0) {
    errors.push(
      `Invalid actions for role kind ${config.kind}: ${invalidActions.join(
        ", "
      )}`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Get the role kind from a role name
 */
export function getRoleKindFromName(
  name: string
): (typeof role_kind_enum.enumValues)[number] | null {
  const normalizedName = name.toLowerCase().trim();
  const role = Object.values(DEFAULT_ROLES).find(
    (r) => r.name.toLowerCase() === normalizedName
  );
  return role?.kind ?? null;
}

/**
 * Check if a role is of a specific kind
 */
export function isRoleKind(
  role: Role,
  kind: (typeof role_kind_enum.enumValues)[number]
): boolean {
  return role.kind === kind;
}

/**
 * Get all account-related actions
 */
export function getAccountActions(): AccountAction[] {
  return ["view_billing", "manage_billing"];
}

/**
 * Get all tenant-related actions
 */
export function getTenantActions(): TenantAction[] {
  return [
    "manage_users",
    "manage_roles",
    "manage_settings",
    "view_analytics",
    "manage_content",
  ];
}

/**
 * Check if a user has a specific permission across all their roles
 */
export function hasPermissionInRoles(roles: Role[], action: Action): boolean {
  return roles.some((role) => hasPermission(role, action));
}

/**
 * Check if a user has all specified permissions across their roles
 */
export function hasAllPermissionsInRoles(
  roles: Role[],
  actions: Action[]
): boolean {
  return actions.every((action) => hasPermissionInRoles(roles, action));
}

/**
 * Check if a user has any of the specified permissions across their roles
 */
export function hasAnyPermissionInRoles(
  roles: Role[],
  actions: Action[]
): boolean {
  return actions.some((action) => hasPermissionInRoles(roles, action));
}

/**
 * Get all unique permissions a user has across their roles
 */
export function getAllPermissionsInRoles(roles: Role[]): Action[] {
  const permissions = new Set<Action>();
  for (const role of roles) {
    for (const action of role.allowed) {
      permissions.add(action as Action);
    }
  }
  return Array.from(permissions);
}

/**
 * Check if a user has a specific role kind across their roles
 */
export function hasRoleKind(
  roles: Role[],
  kind: (typeof role_kind_enum.enumValues)[number]
): boolean {
  return roles.some((role) => isRoleKind(role, kind));
}

/**
 * Get all role kinds a user has
 */
export function getUserRoleKinds(
  roles: Role[]
): (typeof role_kind_enum.enumValues)[number][] {
  return roles.map((role) => role.kind);
}
