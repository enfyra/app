import { processHeaderAction } from '~/utils/common/action-processor';
import type { HeaderAction } from '~/types';

const subActionOwners = new Map<string, number>();
const subActionRoutes = new Map<string, string>();

export function useSubHeaderActionRegistry(
  actions?: HeaderAction | HeaderAction[]
) {
  const ownerUid = getCurrentInstance()?.uid;
  const route = ownerUid !== undefined ? useRoute() : null;
  const ownerRoutePath = route?.path ?? "";
  const ownedActionIds = new Set<string>();
  const actionsRaw = useState<HeaderAction[]>("sub-header-actions", () => []);

  const subHeaderActions = computed<HeaderAction[]>(() => {
    return [...actionsRaw.value]
      .filter((action) => !subActionRoutes.has(action.id) || subActionRoutes.get(action.id) === route?.path)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  });

  const registerOne = (action: HeaderAction, ownerUid?: number) => {
    if (ownerUid !== undefined && !action.global && route && route.path !== ownerRoutePath) return;
    const processed = processHeaderAction(action);
    const existingIndex = actionsRaw.value.findIndex(a => a.id === action.id);
    if (existingIndex > -1) {
      actionsRaw.value[existingIndex] = processed;
    } else {
      actionsRaw.value.push(processed);
    }
    if (ownerUid !== undefined) {
      subActionOwners.set(action.id, ownerUid);
      ownedActionIds.add(action.id);
    }
    if (action.global || ownerUid === undefined) subActionRoutes.delete(action.id);
    else subActionRoutes.set(action.id, ownerRoutePath);
  };

  const register = (actions: HeaderAction | HeaderAction[]) => {
    const arr = Array.isArray(actions) ? actions : [actions];
    arr.forEach(action => registerOne(action, ownerUid));
  };

  const cleanupOwnedActions = (includeGlobal: boolean) => {
    ownedActionIds.forEach((id) => {
      const action = actionsRaw.value.find((item) => item.id === id);
      if (subActionOwners.get(id) !== ownerUid) {
        ownedActionIds.delete(id);
        return;
      }
      if (!includeGlobal && action?.global) return;
      unregister(id);
      ownedActionIds.delete(id);
    });
  };

  const unregister = (id: string) => {
    const index = actionsRaw.value.findIndex(a => a.id === id);
    if (index > -1) actionsRaw.value.splice(index, 1);
    subActionOwners.delete(id);
    subActionRoutes.delete(id);
  };

  const clear = () => {
    actionsRaw.value = [];
    subActionOwners.clear();
    subActionRoutes.clear();
  };

  if (actions) {
    const arr = Array.isArray(actions) ? actions : [actions];
    arr.forEach(a => registerOne(a, ownerUid));
  }

  if (ownerUid !== undefined) {
    const stopRouteWatch = watch(
      () => route!.path,
      (newPath, oldPath) => {
        if (newPath !== oldPath) cleanupOwnedActions(false);
      },
      { flush: "sync" },
    );

    onUnmounted(() => {
      stopRouteWatch();
      cleanupOwnedActions(true);
    });
  }

  return {
    subHeaderActions,
    register,
    unregister,
    clear,
  };
}
