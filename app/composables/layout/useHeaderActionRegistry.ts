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

  const headerActions = computed<HeaderAction[]>(() => {
    const sorted = [...headerActionsRaw.value].sort((a, b) => {
      const orderA = a.order ?? 0;
      const orderB = b.order ?? 0;
      return orderA - orderB;
    });
    return sorted;
  });

  const registerHeaderAction = (action: HeaderAction) => {
    const processedAction = Object.create(Object.getPrototypeOf(action));
    
    for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(action))) {
      Object.defineProperty(processedAction, key, descriptor);
    }
    
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
        processedAction.component = markRaw(processedAction.component);
      }
    }

    const existingIndex = headerActionsRaw.value.findIndex(
      (a) => a.id === action.id
    );
    if (existingIndex > -1) {
      headerActionsRaw.value[existingIndex] = processedAction;
    } else {
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

  const register = (action: HeaderAction) => {
    const currentRoute = route.path;
    const existingActions = routeActions.value.get(currentRoute) || [];

    const existingIndex = existingActions.findIndex((a) => a.id === action.id);
    if (existingIndex > -1) {
      existingActions[existingIndex] = action;
    } else {
      existingActions.push(action);
    }

    routeActions.value.set(currentRoute, existingActions);
    registerHeaderAction(action);
  };

  const registerMultiple = (actions: HeaderAction[]) => {
    const currentRoute = route.path;
    const existingActions = routeActions.value.get(currentRoute) || [];

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

  if (actions) {
    const actionsArray = Array.isArray(actions) ? actions : [actions];
    registerMultiple(actionsArray);
  }

  watch(
    () => route.path,
    (newPath, oldPath) => {
      const globalActions = headerActionsRaw.value.filter(action => action.global);
      headerActionsRaw.value = globalActions;

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
