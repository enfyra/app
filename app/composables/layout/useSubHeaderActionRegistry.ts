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

  const subHeaderActions = computed(() => {
    return [...subHeaderActionsRaw.value].sort((a, b) => {
      const orderA = a.order ?? 0;
      const orderB = b.order ?? 0;
      return orderA - orderB;
    });
  });

  const registerSubHeaderAction = (action: HeaderAction) => {
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
        processedAction.component = markRaw(processedAction.component as any);
      }
    }

    const existingIndex = subHeaderActionsRaw.value.findIndex(
      (a) => a.id === action.id
    );
    if (existingIndex > -1) {
      subHeaderActionsRaw.value[existingIndex] = processedAction;
    } else {
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
    registerSubHeaderAction(action);
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
    registerSubHeaderActions(actions);
  };

  if (actions) {
    const actionsArray = Array.isArray(actions) ? actions : [actions];
    registerMultiple(actionsArray);
  }

  watch(
    () => route.path,
    (newPath, oldPath) => {
      const globalActions = subHeaderActionsRaw.value.filter(action => action.global);
      subHeaderActionsRaw.value = globalActions;

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