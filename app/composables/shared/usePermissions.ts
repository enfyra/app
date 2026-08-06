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

    const normalizedRoutePath = routePath.startsWith("/")
      ? routePath
      : `/${routePath}`;

    if (me.value.allowedRoutePermissions) {
      const { getId } = useDatabase();
      const myId = getId(me.value);
      const directPermissions = asRelationArray(me.value.allowedRoutePermissions).filter(
        (permission: any) =>
          permission.route?.path === normalizedRoutePath &&
          permission.isEnabled &&
          asRelationArray(permission.allowedUsers).some(
            (user: unknown) => relationId(user) === String(myId)
          )
      );

      if (directPermissions.length > 0) {
        const hasDirectMethodPermission = directPermissions.some((permission: any) => {
          return asRelationArray(permission.methods).some(
            (methodObj: unknown) => methodName(methodObj) === method.toUpperCase()
          );
        });

        return hasDirectMethodPermission;
      }
    }

    if (!me.value.role?.routePermissions) return false;

    const routePermissions = asRelationArray(me.value.role.routePermissions).filter(
      (permission: any) =>
        permission.route?.path === normalizedRoutePath && permission.isEnabled
    );

    if (!routePermissions.length) return false;

    const hasMethodPermission = routePermissions.some((permission: any) =>
      asRelationArray(permission.methods).some(
        (methodObj: unknown) => methodName(methodObj) === method.toUpperCase()
      )
    );

    if (hasMethodPermission) {
      const { getId } = useDatabase();
      const myId = getId(me.value);
      return routePermissions.some((permission: any) => {
        const allowedUsers = asRelationArray(permission.allowedUsers);
        if (allowedUsers.length === 0) {
          return true;
        }
        return allowedUsers.some((userId: unknown) => relationId(userId) === String(myId));
      });
    }

    return false;
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
    if (me.value?.isRootAdmin) {
      return true;
    }

    if (condition && typeof condition === "object" && "route" in condition) {
      return checkPermissionRule(condition as PermissionRule);
    }

    if (condition.rootAdmin === true) {
      return !!me.value?.isRootAdmin;
    }

    if (condition.allowAll === true) {
      return true;
    }

    if (condition.and) {
      return condition.and.every((item) => {
        if ("route" in item) {
          return checkPermissionRule(item as PermissionRule);
        } else {
          return checkPermissionCondition(item as PermissionCondition);
        }
      });
    }

    if (condition.or) {
      return condition.or.some((item) => {
        if ("route" in item) {
          return checkPermissionRule(item as PermissionRule);
        } else {
          return checkPermissionCondition(item as PermissionCondition);
        }
      });
    }

    return false;
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

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    checkPermissionCondition,
  };
}
