export function useStableList<T = any>(
  source: () => T[] | null | undefined,
  loading: () => boolean,
) {
  return useStableListState(source, loading).items;
}

export function useStableListState<T = any>(
  source: () => T[] | null | undefined,
  loading: () => boolean,
  options: { initialDelayMs?: number; refreshDelayMs?: number } = {},
) {
  const items = shallowRef<T[]>([]);
  const initialReady = ref(false);
  const refreshing = ref(false);
  const initialDelayMs = options.initialDelayMs ?? 420;
  const refreshDelayMs = options.refreshDelayMs ?? 180;
  const initialStartedAt = Date.now();
  let refreshStartedAt = 0;
  let initialTimer: ReturnType<typeof setTimeout> | undefined;
  let refreshTimer: ReturnType<typeof setTimeout> | undefined;

  function resolveInitialLoading() {
    if (initialReady.value) return;

    const remaining = Math.max(0, initialDelayMs - (Date.now() - initialStartedAt));
    if (remaining === 0) {
      initialReady.value = true;
      return;
    }

    if (initialTimer) clearTimeout(initialTimer);
    initialTimer = setTimeout(() => {
      initialReady.value = true;
    }, remaining);
  }

  function commitItems(nextItems: T[]) {
    items.value = nextItems;
    refreshing.value = false;
  }

  function settleRefresh(nextItems: T[]) {
    if (!refreshing.value) {
      commitItems(nextItems);
      return;
    }

    const remaining = Math.max(0, refreshDelayMs - (Date.now() - refreshStartedAt));
    if (remaining === 0) {
      commitItems(nextItems);
      return;
    }

    if (refreshTimer) clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => {
      commitItems(nextItems);
    }, remaining);
  }

  watch(
    () => [source(), loading()] as const,
    ([nextItems, isLoading]) => {
      if (!Array.isArray(nextItems)) return;

      if (isLoading) {
        if (refreshTimer) {
          clearTimeout(refreshTimer);
          refreshTimer = undefined;
        }
        if (initialReady.value && items.value.length > 0 && !refreshing.value) {
          refreshing.value = true;
          refreshStartedAt = Date.now();
        }
        return;
      }

      settleRefresh(nextItems);
      resolveInitialLoading();
    },
    { immediate: true },
  );

  onUnmounted(() => {
    if (initialTimer) clearTimeout(initialTimer);
    if (refreshTimer) clearTimeout(refreshTimer);
  });

  const stableItems = computed(() => items.value);

  return {
    items: stableItems,
    showInitialLoading: computed(() => !initialReady.value),
    isRefreshing: computed(() => initialReady.value && refreshing.value && items.value.length > 0),
  };
}
