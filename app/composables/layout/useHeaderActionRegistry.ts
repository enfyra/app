import { processHeaderAction } from '~/utils/common/action-processor';

const actionOwners = new Map<string, number>();

export function useHeaderActionRegistry(
  actions?: HeaderAction | HeaderAction[]
) {
  const actionsRaw = useState<HeaderAction[]>("header-actions", () => []);

  const headerActions = computed<HeaderAction[]>(() => {
    return [...actionsRaw.value].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  });

  const register = (action: HeaderAction, ownerUid?: number) => {
    const processed = processHeaderAction(action);
    const existingIndex = actionsRaw.value.findIndex(a => a.id === action.id);
    if (existingIndex > -1) {
      actionsRaw.value[existingIndex] = processed;
    } else {
      actionsRaw.value.push(processed);
    }
    if (ownerUid !== undefined) {
      actionOwners.set(action.id, ownerUid);
    }
  };

  const unregister = (id: string) => {
    const index = actionsRaw.value.findIndex(a => a.id === id);
    if (index > -1) actionsRaw.value.splice(index, 1);
    actionOwners.delete(id);
  };

  const clear = () => {
    actionsRaw.value = [];
    actionOwners.clear();
  };

  if (actions) {
    const arr = Array.isArray(actions) ? actions : [actions];
    const instance = getCurrentInstance();
    const uid = instance?.uid;
    arr.forEach(a => register(a, uid));
    if (instance) {
      onUnmounted(() => {
        arr.forEach(a => {
          if (actionOwners.get(a.id) === uid) {
            unregister(a.id);
          }
        });
      });
    }
  }

  return {
    headerActions,
    register,
    unregister,
    clear,
  };
}
