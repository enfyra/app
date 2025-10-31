import { resolveComponent, markRaw } from 'vue';

export function useHeaderActionRegistry(
  actions?: HeaderAction | HeaderAction[]
) {
  const headerActionsRaw = useState<HeaderAction[]>("header-actions", () => []);
  const route = useRoute();
  const routeActions = useState<Map<string, HeaderAction[]>>(
    "route-actions",
    () => new Map()
  );

  // Computed sorted actions by order (lower numbers first)
  const headerActions = computed<HeaderAction[]>(() => {
    const sorted = [...headerActionsRaw.value].sort((a, b) => {
      const orderA = a.order ?? 0;
      const orderB = b.order ?? 0;
      return orderA - orderB;
    });
    return sorted;
  });

  const registerHeaderAction = (action: HeaderAction) => {
    // Process component while preserving getters
    const processedAction = Object.create(Object.getPrototypeOf(action));
    
    // Copy all properties including getters
    Object.getOwnPropertyNames(action).forEach(prop => {
      const descriptor = Object.getOwnPropertyDescriptor(action, prop);
      if (descriptor) {
        Object.defineProperty(processedAction, prop, descriptor);
      }
    });
    
    // Copy getters specifically
    Object.getOwnPropertyDescriptors(action);
    for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(action))) {
      Object.defineProperty(processedAction, key, descriptor);
    }
    
    // Set default side to "right" if not specified
    if (!processedAction.side) {
      processedAction.side = "right";
    }
    
    if (processedAction.component) {
      if (typeof processedAction.component === 'string') {
        try {
          const componentName = processedAction.component;
          const resolved = resolveComponent(componentName as any);
          if (resolved && typeof resolved !== 'string') {
            processedAction.component = markRaw(resolved);
          }
        } catch (error) {
          console.warn(`Failed to resolve component: ${processedAction.component}`, error);
        }
      } else {
        // Already imported component, just markRaw it
        processedAction.component = markRaw(processedAction.component);
      }
    }

    const existingIndex = headerActionsRaw.value.findIndex(
      (a) => a.id === action.id
    );
    if (existingIndex > -1) {
      // Update existing action
      headerActionsRaw.value[existingIndex] = processedAction;
    } else {
      // Add new action
      headerActionsRaw.value.push(processedAction);
    }
  };

  const registerHeaderActions = (actions: HeaderAction[]) => {
    actions.forEach(registerHeaderAction);
  };

  const unregisterHeaderAction = (id: string) => {
    const index = headerActionsRaw.value.findIndex((a) => a.id === id);
    if (index > -1) {
      headerActionsRaw.value.splice(index, 1);
    }
  };

  const unregisterHeaderActions = (ids: string[]) => {
    ids.forEach(unregisterHeaderAction);
  };

  const clearHeaderActions = () => {
    headerActionsRaw.value = [];
  };

  const getHeaderActions = () => {
    return headerActions.value;
  };

  // Register single action for current route
  const register = (action: HeaderAction) => {
    const currentRoute = route.path;
    const existingActions = routeActions.value.get(currentRoute) || [];

    // Add or update action in route actions
    const existingIndex = existingActions.findIndex((a) => a.id === action.id);
    if (existingIndex > -1) {
      existingActions[existingIndex] = action;
    } else {
      existingActions.push(action);
    }

    routeActions.value.set(currentRoute, existingActions);
    registerHeaderAction(action);
  };

  // Register multiple actions for current route
  const registerMultiple = (actions: HeaderAction[]) => {
    const currentRoute = route.path;
    const existingActions = routeActions.value.get(currentRoute) || [];

    // Merge new actions with existing ones
    actions.forEach((action) => {
      const existingIndex = existingActions.findIndex(
        (a) => a.id === action.id
      );
      if (existingIndex > -1) {
        existingActions[existingIndex] = action;
      } else {
        existingActions.push(action);
      }
    });

    routeActions.value.set(currentRoute, existingActions);
    registerHeaderActions(actions);
  };

  // If actions are provided, register them immediately
  if (actions) {
    const actionsArray = Array.isArray(actions) ? actions : [actions];
    registerMultiple(actionsArray);
  }

  // Clear actions when route changes and re-register for new route
  watch(
    () => route.path,
    (newPath, oldPath) => {
      // Keep global actions, clear only route-specific actions
      const globalActions = headerActionsRaw.value.filter(action => action.global);
      headerActionsRaw.value = globalActions;

      // Re-register all actions for new route if exist
      const routeActionsForPath = routeActions.value.get(newPath);
      if (routeActionsForPath && routeActionsForPath.length > 0) {
        registerHeaderActions(routeActionsForPath);
      }
    },
    { immediate: true }
  );

  return {
    headerActions,
    register,
  };
}
