export function useSettingsQuickSearch(field: string, refresh: () => unknown | Promise<unknown>) {
  const route = useRoute();
  const router = useRouter();
  const searchQuery = ref(typeof route.query.search === 'string' ? route.query.search : '');
  const searchValue = computed(() => typeof route.query.search === 'string' ? route.query.search.trim() : '');
  const searchFilter = computed<Record<string, unknown> | null>(() => {
    if (!searchValue.value) return null;
    return field.split('.').reduceRight<Record<string, unknown>>(
      (condition, key) => ({ [key]: condition }),
      { _contains: searchValue.value },
    );
  });

  watch(() => route.query.search, value => {
    searchQuery.value = typeof value === 'string' ? value : '';
  });

  async function submitSearch() {
    const value = searchQuery.value.trim();
    searchQuery.value = value;
    if (value === searchValue.value && Math.max(1, Number(route.query.page) || 1) === 1) {
      await refresh();
      return;
    }
    await router.push({
      path: route.path,
      query: { ...route.query, search: value || undefined, page: undefined },
    });
  }

  return { searchQuery, searchValue, searchFilter, submitSearch };
}
