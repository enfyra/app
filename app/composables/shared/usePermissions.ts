export function usePermissions() {
  const { me } = useEnfyraAuth();

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
      permission.methods.some((methodObj: any) => methodObj.method === method)
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

  const checkPermissionRule = (rule: PermissionRule): boolean => {
    if (rule.allowAll === true) {
      return true;
    }
    
    return rule.actions.every((action) => {
      switch (action) {
        case "read":
          return hasPermission(rule.route, "GET");
        case "create":
          return hasPermission(rule.route, "POST");
        case "update":
          return hasPermission(rule.route, "PATCH");
        case "delete":
          return hasPermission(rule.route, "DELETE");
        default:
          return false;
      }
    });
  };

  const checkPermissionCondition = (
    condition: PermissionCondition
  ): boolean => {
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
    return routes.some((routePath) => {
      return actions.some((action) => {
        switch (action) {
          case "read":
            return hasPermission(routePath, "GET");
          case "create":
            return hasPermission(routePath, "POST");
          case "update":
            return hasPermission(routePath, "PATCH");
          case "delete":
            return hasPermission(routePath, "DELETE");
          default:
            return false;
        }
      });
    });
  };

  const hasAllPermissions = (routes: string[], actions: string[]): boolean => {
    return routes.every((routePath) => {
      return actions.every((action) => {
        switch (action) {
          case "read":
            return hasPermission(routePath, "GET");
          case "create":
            return hasPermission(routePath, "POST");
          case "update":
            return hasPermission(routePath, "PATCH");
          case "delete":
            return hasPermission(routePath, "DELETE");
          default:
            return false;
        }
      });
    });
  };

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    checkPermissionCondition,
  };
}
