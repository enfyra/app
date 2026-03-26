import { processHeaderAction } from '~/utils/common/action-processor';

const subActionOwners = new Map<string, number>();

export function useSubHeaderActionRegistry(
  actions?: HeaderAction | HeaderAction[]
) {
  const actionsRaw = useState<HeaderAction[]>("sub-header-actions", () => []);

  const subHeaderActions = computed<HeaderAction[]>(() => {
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
      subActionOwners.set(action.id, ownerUid);
    }
  };

  const unregister = (id: string) => {
    const index = actionsRaw.value.findIndex(a => a.id === id);
    if (index > -1) actionsRaw.value.splice(index, 1);
    subActionOwners.delete(id);
  };

  const clear = () => {
    actionsRaw.value = [];
    subActionOwners.clear();
  };

  if (actions) {
    const arr = Array.isArray(actions) ? actions : [actions];
    const instance = getCurrentInstance();
    const uid = instance?.uid;
    arr.forEach(a => register(a, uid));
    if (instance) {
      onUnmounted(() => {
        arr.forEach(a => {
          if (subActionOwners.get(a.id) === uid) {
            unregister(a.id);
          }
        });
      });
    }
  }

  return {
    subHeaderActions,
    register,
    unregister,
    clear,
  };
}
