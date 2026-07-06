import { computed, getCurrentInstance, markRaw, onUnmounted, resolveComponent } from "vue";
import type { AccountPanelItem } from "~/types/ui";

const accountPanelItemOwners = new Map<string, number>();

function processAccountPanelItem(item: AccountPanelItem): AccountPanelItem {
  const processed = Object.create(Object.getPrototypeOf(item));

  for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(item))) {
    Object.defineProperty(processed, key, descriptor);
  }

  const componentKeys: Array<"component" | "contentComponent"> = ["component", "contentComponent"];

  for (const key of componentKeys) {
    if (!processed[key]) continue;

    if (typeof processed[key] === "string") {
      try {
        const resolved = resolveComponent(processed[key] as any);
        if (resolved && typeof resolved !== "string") {
          processed[key] = markRaw(resolved);
        }
      } catch (error) {
        console.warn(`Failed to resolve account panel component: ${processed[key]}`, error);
      }
    } else {
      processed[key] = markRaw(processed[key]);
    }
  }

  return processed;
}

export function useAccountPanelRegistry(items?: AccountPanelItem | AccountPanelItem[]) {
  const ownerUid = getCurrentInstance()?.uid;
  const ownedItemIds = new Set<string>();
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
      ownedItemIds.add(item.id);
    }
  };

  const register = (nextItems: AccountPanelItem | AccountPanelItem[]) => {
    const normalizedItems = Array.isArray(nextItems) ? nextItems : [nextItems];
    normalizedItems.forEach((item) => registerOne(item, ownerUid));
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
    const normalizedItems = Array.isArray(items) ? items : [items];
    normalizedItems.forEach((item) => registerOne(item, ownerUid));
  }

  if (ownerUid !== undefined) {
    onUnmounted(() => {
      ownedItemIds.forEach((id) => {
        if (accountPanelItemOwners.get(id) === ownerUid) {
          unregister(id);
        }
      });
      ownedItemIds.clear();
    });
  }

  return {
    accountPanelItems,
    register,
    unregister,
    clear,
  };
}
