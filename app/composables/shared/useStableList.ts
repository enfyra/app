export function useStableListState<T = any>(
  source: () => T[] | null | undefined,
  loading: () => boolean,
  options: { initialDelayMs?: number } = {},
) {
  const items = shallowRef<T[]>([]);
  const initialReady = ref(false);
  const refreshing = ref(false);
  const initialDelayMs = options.initialDelayMs ?? 420;
  const initialStartedAt = Date.now();
  let requestStarted = false;
  let initialTimer: ReturnType<typeof setTimeout> | undefined;

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

  watch(
    () => [source(), loading()] as const,
    ([nextItems, isLoading]) => {
      if (isLoading) {
        requestStarted = true;
        if (initialReady.value && items.value.length > 0 && !refreshing.value) {
          refreshing.value = true;
        }
        return;
      }

      if (!Array.isArray(nextItems)) {
        if (requestStarted) {
          refreshing.value = false;
          resolveInitialLoading();
        }
        return;
      }

      // Commit as soon as the new rows are here. Holding them back on a timer made
      // every page change wait out the remainder of a fixed delay on fast APIs,
      // which read as a sluggish pager; the in-flight dim already covers the gap.
      commitItems(nextItems);
      resolveInitialLoading();
    },
    { immediate: true },
  );

  onUnmounted(() => {
    if (initialTimer) clearTimeout(initialTimer);
  });

  const stableItems = computed(() => items.value);
  const { active: refreshIndicator } = useDeferredBusy(() => refreshing.value);

  return {
    items: stableItems,
    showInitialLoading: computed(() => !initialReady.value),
    isRefreshing: computed(() => initialReady.value && refreshIndicator.value && items.value.length > 0),
  };
}
