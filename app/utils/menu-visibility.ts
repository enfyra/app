import type { MenuPermission } from "~/types/menu";

type MenuVisibilityRecord = {
  isEnabled?: boolean;
  isPublic?: boolean;
  menuPermissions?: MenuPermission[] | MenuPermission | null;
};

function relationId(value: unknown): string | null {
  if (value && typeof value === "object") {
    const candidate = value as { id?: unknown; _id?: unknown };
    const id = candidate.id ?? candidate._id;
    return id == null ? null : String(id);
  }
  return value == null ? null : String(value);
}

function asPermissionArray(value: MenuVisibilityRecord["menuPermissions"]): MenuPermission[] {
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
}

export function canSeeMenu(
  menu: MenuVisibilityRecord | null | undefined,
  roles: unknown,
  isRootAdmin = false,
): boolean {
  if (!menu || menu.isEnabled === false) return false;
  if (isRootAdmin || menu.isPublic === true) return true;

  const permissions = asPermissionArray(menu.menuPermissions);

  const roleIds = new Set(
    (Array.isArray(roles) ? roles : [roles])
      .map(relationId)
      .filter((roleId): roleId is string => roleId !== null),
  );
  if (roleIds.size === 0) return false;

  return permissions.some((permission) =>
    permission.isEnabled !== false && roleIds.has(relationId(permission.role) ?? ''),
  );
}
