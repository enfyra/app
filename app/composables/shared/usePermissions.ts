export function usePermissions() {
  const { me } = useAuth();

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
      const directPermissions = me.value.allowedRoutePermissions.filter(
        (permission: any) =>
          permission.route?.path === normalizedRoutePath &&
          permission.isEnabled &&
          permission.allowedUsers?.some((user: any) => getId(user) === myId)
      );

      if (directPermissions.length > 0) {
        const hasDirectMethodPermission = directPermissions.some((permission: any) => {
          if (permission.methods && permission.methods.length > 0) {
            return permission.methods.some((methodObj: any) => methodObj.name === method);
          }
          return false;
        });

        return hasDirectMethodPermission;
      }
    }

    if (!me.value.role?.routePermissions) return false;

    const routePermissions = me.value.role.routePermissions.filter(
      (permission: any) =>
        permission.route?.path === normalizedRoutePath && permission.isEnabled
    );

    if (!routePermissions.length) return false;

    const hasMethodPermission = routePermissions.some((permission: any) =>
      permission.methods?.some((methodObj: any) => methodObj.name === method)
    );

    if (hasMethodPermission) {
      const { getId } = useDatabase();
      const myId = getId(me.value);
      return routePermissions.some((permission: any) => {
        if (!permission.allowedUsers || permission.allowedUsers.length === 0) {
          return true;
        }
        return permission.allowedUsers.some((userId: any) => String(userId) === String(myId));
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
