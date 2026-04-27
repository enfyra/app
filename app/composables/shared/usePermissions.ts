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
            return permission.methods.some((methodObj: any) => methodObj.method === method);
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
      permission.methods?.some((methodObj: any) => methodObj.method === method)
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

  const actionToMethod = (action: string): string | null => {
    switch (action) {
      case "read":   return "GET";
      case "create": return "POST";
      case "update": return "PATCH";
      case "delete": return "DELETE";
      default:       return null;
    }
  };

  const checkPermissionRule = (rule: PermissionRule): boolean => {
    if (rule.allowAll === true) {
      return true;
    }

    return rule.actions.every((action) => {
      const method = actionToMethod(action);
      return method ? hasPermission(rule.route, method) : false;
    });
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

  const hasAnyPermission = (routes: string[], actions: string[]): boolean => {
    return routes.some((routePath) =>
      actions.some((action) => {
        const method = actionToMethod(action);
        return method ? hasPermission(routePath, method) : false;
      })
    );
  };

  const hasAllPermissions = (routes: string[], actions: string[]): boolean => {
    return routes.every((routePath) =>
      actions.every((action) => {
        const method = actionToMethod(action);
        return method ? hasPermission(routePath, method) : false;
      })
    );
  };

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    checkPermissionCondition,
  };
}
