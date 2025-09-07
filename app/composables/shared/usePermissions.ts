export function usePermissions() {
  const { me } = useEnfyraAuth();

  // Helper function to check if user has permission for a specific route and method
  const hasPermission = (routePath: string, method: string): boolean => {
    if (!me.value) {
      return false;
    }

    // Root admin has all permissions
    if (me.value.isRootAdmin) {
      return true;
    }

    // Normalize route path - ensure it starts with /
    const normalizedRoutePath = routePath.startsWith("/")
      ? routePath
      : `/${routePath}`;

    // First, check direct user route permissions (bypasses role check)
    if (me.value.allowedRoutePermissions) {
      const directPermissions = me.value.allowedRoutePermissions.filter(
        (permission: any) =>
          permission.route?.path === normalizedRoutePath && 
          permission.isEnabled &&
          permission.allowedUsers?.some((user: any) => user.id === me.value.id)
      );

      if (directPermissions.length > 0) {
        // Check if any direct permission has the required method
        const hasDirectMethodPermission = directPermissions.some((permission: any) => {
          // If methods array exists and has items, check for the specific method
          if (permission.methods && permission.methods.length > 0) {
            const hasMethod = permission.methods.some((methodObj: any) => methodObj.method === method);
            return hasMethod;
          }
          // If methods is empty or doesn't exist, this permission doesn't grant the requested method
          return false;
        });
        
        // Only return true if the method is explicitly allowed
        if (hasDirectMethodPermission) {
          return true;
        }
        // If user has direct permission but not for this method, return false
        // Don't fall through to role check
        return false;
      }
    }

    // If no direct permission, check role-based permissions
    if (!me.value.role?.routePermissions) return false;

    // Find all route permissions that match the route path
    const routePermissions = me.value.role.routePermissions.filter(
      (permission: any) =>
        permission.route?.path === normalizedRoutePath && permission.isEnabled
    );

    if (!routePermissions.length) return false;

    // Check if any permission has the required method
    const hasMethodPermission = routePermissions.some((permission: any) =>
      permission.methods.some((methodObj: any) => methodObj.method === method)
    );

    // If method permission exists, check if user is in allowedUsers
    if (hasMethodPermission) {
      return routePermissions.some((permission: any) => {
        // If no allowedUsers specified, permission applies to all users with role
        if (!permission.allowedUsers || permission.allowedUsers.length === 0) {
          return true;
        }
        // Check if current user is in allowedUsers list
        return permission.allowedUsers.includes(me.value.id);
      });
    }

    return false;
  };

  // Check if user has permission for a single rule
  const checkPermissionRule = (rule: PermissionRule): boolean => {
    // If allowAll is explicitly set to true, allow access
    if (rule.allowAll === true) {
      return true;
    }
    
    // Check actions using normal permission system
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

  // Check if user has permission for a condition
  const checkPermissionCondition = (
    condition: PermissionCondition
  ): boolean => {
    // Global allowAll bypass
    if (condition.allowAll === true) {
      return true;
    }

    // AND logic: ALL conditions must pass
    if (condition.and) {
      return condition.and.every((item) => {
        if ("route" in item) {
          return checkPermissionRule(item as PermissionRule);
        } else {
          return checkPermissionCondition(item as PermissionCondition);
        }
      });
    }

    // OR logic: ANY condition can pass (early return on first true)
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

  // Legacy methods for backward compatibility
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
