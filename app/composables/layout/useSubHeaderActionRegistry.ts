import { resolveComponent, markRaw } from 'vue';

export function useSubHeaderActionRegistry(
  actions?: HeaderAction | HeaderAction[]
) {
  const subHeaderActionsRaw = useState<HeaderAction[]>("sub-header-actions", () => []);
  const route = useRoute();
  const routeActions = useState<Map<string, HeaderAction[]>>(
    "sub-route-actions",
    () => new Map()
  );

  // Computed sorted actions by order (lower numbers first)
  const subHeaderActions = computed(() => {
    return [...subHeaderActionsRaw.value].sort((a, b) => {
      const orderA = a.order ?? 0;
      const orderB = b.order ?? 0;
      return orderA - orderB;
    });
  });

  const registerSubHeaderAction = (action: HeaderAction) => {
    // Process component while preserving getters
    const processedAction = Object.create(Object.getPrototypeOf(action));
    
    // Copy all properties including getters
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
        processedAction.component = markRaw(processedAction.component as any);
      }
    }

    const existingIndex = subHeaderActionsRaw.value.findIndex(
      (a) => a.id === action.id
    );
    if (existingIndex > -1) {
      // Update existing action
      subHeaderActionsRaw.value[existingIndex] = processedAction;
    } else {
      // Add new action
      subHeaderActionsRaw.value.push(processedAction);
    }
  };

  const registerSubHeaderActions = (actions: HeaderAction[]) => {
    actions.forEach(registerSubHeaderAction);
  };

  const unregisterSubHeaderAction = (id: string) => {
    const index = subHeaderActionsRaw.value.findIndex((a) => a.id === id);
    if (index > -1) {
      subHeaderActionsRaw.value.splice(index, 1);
    }
  };

  const unregisterSubHeaderActions = (ids: string[]) => {
    ids.forEach(unregisterSubHeaderAction);
  };

  const clearSubHeaderActions = () => {
    subHeaderActionsRaw.value = [];
  };

  const getSubHeaderActions = () => {
    return subHeaderActions.value;
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
    registerSubHeaderAction(action);
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
    registerSubHeaderActions(actions);
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
      const globalActions = subHeaderActionsRaw.value.filter(action => action.global);
      subHeaderActionsRaw.value = globalActions;

      // Re-register all actions for new route if exist
      const routeActionsForPath = routeActions.value.get(newPath);
      if (routeActionsForPath && routeActionsForPath.length > 0) {
        registerSubHeaderActions(routeActionsForPath);
      }
    },
    { immediate: true }
  );

  return {
    subHeaderActions,
    register,
    unregisterSubHeaderAction,
    unregisterSubHeaderActions,
    clearSubHeaderActions,
  };
}