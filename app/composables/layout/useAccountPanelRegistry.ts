import { computed, getCurrentInstance, markRaw, onUnmounted, resolveComponent } from "vue";
import type { AccountPanelItem } from "~/types/ui";

const accountPanelItemOwners = new Map<string, number>();

function processAccountPanelItem(item: AccountPanelItem): AccountPanelItem {
  const processed = Object.create(Object.getPrototypeOf(item));

  for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(item))) {
    Object.defineProperty(processed, key, descriptor);
  }

  if (processed.component) {
    if (typeof processed.component === "string") {
      try {
        const resolved = resolveComponent(processed.component as any);
        if (resolved && typeof resolved !== "string") {
          processed.component = markRaw(resolved);
        }
      } catch (error) {
        console.warn(`Failed to resolve account panel component: ${processed.component}`, error);
      }
    } else {
      processed.component = markRaw(processed.component);
    }
  }

  return processed;
}

export function useAccountPanelRegistry(items?: AccountPanelItem | AccountPanelItem[]) {
  const itemsRaw = useState<AccountPanelItem[]>("account-panel-items", () => []);

  const accountPanelItems = computed<AccountPanelItem[]>(() => {
    return [...itemsRaw.value].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  });

  const registerOne = (item: AccountPanelItem, ownerUid?: number) => {
    const processed = processAccountPanelItem(item);
    const existingIndex = itemsRaw.value.findIndex((candidate) => candidate.id === item.id);
    if (existingIndex > -1) {
      itemsRaw.value[existingIndex] = processed;
    } else {
      itemsRaw.value.push(processed);
    }
    if (ownerUid !== undefined) {
      accountPanelItemOwners.set(item.id, ownerUid);
    }
  };

  const register = (nextItems: AccountPanelItem | AccountPanelItem[]) => {
    const ownerUid = getCurrentInstance()?.uid;
    const normalizedItems = Array.isArray(nextItems) ? nextItems : [nextItems];
    normalizedItems.forEach((item) => registerOne(item, ownerUid));
    if (ownerUid !== undefined) {
      onUnmounted(() => {
        normalizedItems.forEach((item) => {
          if (accountPanelItemOwners.get(item.id) === ownerUid) {
            unregister(item.id);
          }
        });
      });
    }
  };

  const unregister = (id: string) => {
    const index = itemsRaw.value.findIndex((item) => item.id === id);
    if (index > -1) itemsRaw.value.splice(index, 1);
    accountPanelItemOwners.delete(id);
  };

  const clear = () => {
    itemsRaw.value = [];
    accountPanelItemOwners.clear();
  };

  if (items) {
    const ownerUid = getCurrentInstance()?.uid;
    const normalizedItems = Array.isArray(items) ? items : [items];
    normalizedItems.forEach((item) => registerOne(item, ownerUid));
    if (ownerUid !== undefined) {
      onUnmounted(() => {
        normalizedItems.forEach((item) => {
          if (accountPanelItemOwners.get(item.id) === ownerUid) {
            unregister(item.id);
          }
        });
      });
    }
  }

  return {
    accountPanelItems,
    register,
    unregister,
    clear,
  };
}
