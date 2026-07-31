import { EXTENSION_RUNTIME_FIELDS, prefixFields } from "~/utils/extension-fields";

const PREFETCH_INTENT_DELAY_MS = 120;
const MAX_CHECKED_MENUS = 100;

const checkedMenuIds: string[] = [];
const checkedMenuIdSet = new Set<string>();
const inFlightPrefetches = new Map<string, Promise<void>>();
let intentTimer: ReturnType<typeof setTimeout> | null = null;

function markMenuChecked(menuId: string) {
  if (checkedMenuIdSet.has(menuId)) return;
  checkedMenuIdSet.add(menuId);
  checkedMenuIds.push(menuId);
  if (checkedMenuIds.length > MAX_CHECKED_MENUS) {
    const oldest = checkedMenuIds.shift();
    if (oldest) checkedMenuIdSet.delete(oldest);
  }
}

export function useExtensionPrefetch() {
  const { findBestMenuMatch } = useMenuRegistry();
  const {
    getCachedExtensionMeta,
    setCachedExtensionMeta,
    getCachedComponent,
    loadDynamicComponent,
  } = useDynamicComponent();
  const router = useRouter();

  const isDynamicMenuTarget = (path: string): boolean => {
    try {
      const resolved = router.resolve(path);
      return resolved.matched.some((record) => record.name === "sidebar-path");
    } catch {
      return false;
    }
  };

  const prefetchForPath = async (rawPath?: string): Promise<void> => {
    if (!import.meta.client || !rawPath || !isDynamicMenuTarget(rawPath)) return;

    const matchedItem = findBestMenuMatch(rawPath)?.item;
    if (!matchedItem || matchedItem.id == null) return;
    const menuId = String(matchedItem.id);

    const cacheKey = `menu:${menuId}`;
    if (checkedMenuIdSet.has(menuId) || inFlightPrefetches.has(cacheKey)) return;

    const cachedMeta = getCachedExtensionMeta(cacheKey);
    if (cachedMeta && getCachedComponent(cachedMeta.extensionId, cachedMeta.updatedAt)) {
      markMenuChecked(menuId);
      return;
    }

    const task = (async () => {
      try {
        const response = await $fetch<{ data?: any[] }>("/api/enfyra_menu", {
          query: {
            fields: ["*", prefixFields("extension", EXTENSION_RUNTIME_FIELDS)].join(","),
            filter: {
              _and: [{ id: { _eq: matchedItem.id } }, { isEnabled: { _eq: true } }],
            },
          },
        });

        const extension = response?.data?.[0]?.extension;
        if (!extension || extension.length === 0) return;
        if (!extension.isEnabled || !extension.compiledCode) return;

        setCachedExtensionMeta(cacheKey, extension);
        await loadDynamicComponent(extension.compiledCode, extension.extensionId, extension.updatedAt, false);
      } catch {
        markMenuChecked(menuId);
        return;
      }
      markMenuChecked(menuId);
    })();

    inFlightPrefetches.set(cacheKey, task);
    try {
      await task;
    } finally {
      inFlightPrefetches.delete(cacheKey);
    }
  };

  const schedulePrefetchIntent = (path?: string) => {
    cancelPrefetchIntent();
    if (!path) return;
    intentTimer = setTimeout(() => {
      intentTimer = null;
      void prefetchForPath(path);
    }, PREFETCH_INTENT_DELAY_MS);
  };

  const cancelPrefetchIntent = () => {
    if (intentTimer) {
      clearTimeout(intentTimer);
      intentTimer = null;
    }
  };

  return {
    prefetchForPath,
    schedulePrefetchIntent,
    cancelPrefetchIntent,
  };
}
