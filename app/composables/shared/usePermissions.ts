import { canSeeMenu as canSeeMenuByRole } from "~/utils/menu-visibility";
import type { PermissionCondition, PermissionRule } from "~/types/permissions";
import { evaluatePermissionCondition } from "~/utils/permission-condition";

export function usePermissions() {
  const { me } = useAuth();

  const asRelationArray = (value: unknown): any[] => {
    if (Array.isArray(value)) return value;
    if (value == null) return [];
    return [value];
  };

  const relationId = (value: unknown): string | null => {
    if (value && typeof value === "object") {
      const candidate = value as { id?: unknown; _id?: unknown };
      const id = candidate.id ?? candidate._id;
      return id == null ? null : String(id);
    }
    return value == null ? null : String(value);
  };

  const methodName = (value: unknown): string | null => {
    if (typeof value === "string") return value.toUpperCase();
    if (!value || typeof value !== "object") return null;
    const candidate = value as { name?: unknown; method?: unknown };
    const name = candidate.name ?? candidate.method;
    return typeof name === "string" ? name.toUpperCase() : null;
  };

  const hasPermission = (routePath: string, method: string): boolean => {
    if (!me.value) {
      return false;
    }

    if (me.value.isRootAdmin) {
      return true;
    }

    const normalizedRoutePath = (routePath.startsWith('/') ? routePath : `/${routePath}`).toLowerCase();
    const myId = relationId(me.value);
    const roles = asRelationArray(me.value.roles);
    const roleIds = new Set(roles.map(relationId).filter(id => id !== null));
    const matchesOperation = (permission: any) =>
      permission?.isEnabled !== false &&
      permission?.route?.isEnabled !== false &&
      permission?.route?.path?.toLowerCase() === normalizedRoutePath &&
      asRelationArray(permission.routeMethodConfigs).some((operation: any) =>
        operation?.available === true && methodName(operation.method) === method.toUpperCase(),
      );
    const matchesUser = (permission: any) => myId !== null &&
      asRelationArray(permission.allowedUsers).some(user => relationId(user) === myId);

    return asRelationArray(me.value.allowedRoutePermissions).some(permission =>
      matchesOperation(permission) && (matchesUser(permission) || roleIds.has(relationId(permission.role) ?? '')),
    ) || roles.some(role =>
      asRelationArray(role?.routePermissions).some(permission =>
        matchesOperation(permission) &&
        (matchesUser(permission) || roleIds.has(relationId(permission.role) ?? '')),
      ),
    );
  };

  const normalizeMethod = (method: string): string => method.toUpperCase();

  const checkPermissionRule = (rule: PermissionRule): boolean => {
    if (rule.allowAll === true) {
      return true;
    }

    if (!Array.isArray(rule.methods) || rule.methods.length === 0) {
      return false;
    }

    return rule.methods.every((method) =>
      hasPermission(rule.route, normalizeMethod(method))
    );
  };

  const checkPermissionCondition = (
    condition: PermissionCondition
  ): boolean => {
    return evaluatePermissionCondition(
      condition,
      !!me.value?.isRootAdmin,
      checkPermissionRule,
    );
  };

  const hasAnyPermission = (routes: string[], methods: string[]): boolean => {
    return routes.some((routePath) =>
      methods.some((method) => hasPermission(routePath, normalizeMethod(method)))
    );
  };

  const hasAllPermissions = (routes: string[], methods: string[]): boolean => {
    return routes.every((routePath) =>
      methods.every((method) => hasPermission(routePath, normalizeMethod(method)))
    );
  };

  const hasMenuPermission = (menu: unknown): boolean => {
    return canSeeMenuByRole(
      menu as any,
      me.value?.roles ?? [],
      me.value?.isRootAdmin === true,
    );
  };

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    checkPermissionCondition,
    hasMenuPermission,
  };
}
