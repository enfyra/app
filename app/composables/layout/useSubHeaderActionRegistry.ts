import { processHeaderAction } from '~/utils/common/action-processor';
import type { HeaderAction } from '~/types';

const subActionOwners = new Map<string, number>();

export function useSubHeaderActionRegistry(
  actions?: HeaderAction | HeaderAction[]
) {
  const ownerUid = getCurrentInstance()?.uid;
  const ownedActionIds = new Set<string>();
  const actionsRaw = useState<HeaderAction[]>("sub-header-actions", () => []);

  const subHeaderActions = computed<HeaderAction[]>(() => {
    return [...actionsRaw.value].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  });

  const registerOne = (action: HeaderAction, ownerUid?: number) => {
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
  };

  const register = (actions: HeaderAction | HeaderAction[]) => {
    const arr = Array.isArray(actions) ? actions : [actions];
    arr.forEach(action => registerOne(action, ownerUid));
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
    arr.forEach(a => registerOne(a, ownerUid));
  }

  if (ownerUid !== undefined) {
    onUnmounted(() => {
      ownedActionIds.forEach((id) => {
        if (subActionOwners.get(id) === ownerUid) {
          unregister(id);
        }
      });
      ownedActionIds.clear();
    });
  }

  return {
    subHeaderActions,
    register,
    unregister,
    clear,
  };
}
