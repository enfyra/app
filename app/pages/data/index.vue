<script setup lang="ts">
import { useDataCollectionPreferences } from '~/composables/menu/useDataCollectionPreferences';

interface CollectionItem {
  tableName: string;
  label: string;
  icon: string;
  routePath: string;
  apiPath: string;
  description: string;
  isSingleRecord: boolean;
}

type SortMode = 'name' | 'recent';

const { registerPageHeader } = usePageHeaderRegistry();
const { routes, routesLoading, ensureRoutesLoaded } = useRoutes();
const { checkPermissionCondition } = usePermissions();
const { isPinned, togglePin, addRecent } = useDataCollectionPreferences();
const router = useRouter();

const searchQuery = ref('');
const sortBy = ref<SortMode>('name');
const initialLoading = ref(true);

const normalizedSearch = computed(() => searchQuery.value.trim().toLocaleLowerCase());
const hasSearch = computed(() => normalizedSearch.value.length > 0);
const isLoading = computed(() => initialLoading.value || routesLoading.value);

const catalog = computed<CollectionItem[]>(() =>
  routes.value
    .filter((r: any) => r.mainTable && r.isEnabled !== false && !r.mainTable.isSystem && checkPermissionCondition({ or: [{ route: r.path, methods: ['GET'] }] }))
    .map((r: any) => ({
      tableName: String(r.mainTable.name),
      label: String(r.mainTable.alias || r.mainTable.name),
      icon: String(r.mainTable.icon || 'lucide:database'),
      routePath: `/data/${r.mainTable.name}`,
      apiPath: String(r.path),
      description: String(r.mainTable.description || ''),
      isSingleRecord: Boolean(r.mainTable.isSingleRecord),
    })),
);

function compare(a: CollectionItem, b: CollectionItem) {
  return a.label.localeCompare(b.label, undefined, { numeric: true, sensitivity: 'base' });
}

const filtered = computed<CollectionItem[]>(() => {
  const q = normalizedSearch.value;
  const list = q
    ? catalog.value.filter(c => [c.label, c.tableName, c.apiPath].some(v => v.toLocaleLowerCase().includes(q)))
    : [...catalog.value];
  if (sortBy.value === 'recent') {
    const { prefs } = useDataCollectionPreferences();
    const order = new Map(prefs.value.recent.map((t, i) => [t, i]));
    return list.sort((a, b) => {
      const ai = order.get(a.tableName), bi = order.get(b.tableName);
      if (ai === undefined && bi === undefined) return compare(a, b);
      if (ai === undefined) return 1;
      if (bi === undefined) return -1;
      return ai - bi;
    });
  }
  return list.sort(compare);
});

const visible = computed(() => {
  if (hasSearch.value) return filtered.value;
  const pinnedItems = filtered.value.filter(c => isPinned(c.tableName));
  const rest = filtered.value.filter(c => !isPinned(c.tableName));
  return [...pinnedItems, ...rest];
});

function open(item: CollectionItem) {
  addRecent(item.tableName);
  router.push(item.routePath);
}

onMounted(async () => {
  try { await ensureRoutesLoaded(); } finally { initialLoading.value = false; }
});

registerPageHeader({
  title: 'Collections',
  description: 'Browse, search, and manage your data collections.',
  variant: 'minimal',
  gradient: 'cyan',
});
</script>

<template>
  <div class="flex flex-col gap-5 min-w-0 pb-5">
    <DataDirectorySearchBar
      v-model="searchQuery"
      v-model:sort-by="sortBy"
      :total="catalog.length"
      :match-count="filtered.length"
      :loading="isLoading"
      :has-search="hasSearch"
    />

    <div v-if="isLoading" class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      <div v-for="i in 8" :key="i" class="surface-card rounded-[var(--radius-card)] p-4">
        <div class="flex items-start gap-3">
          <div class="w-10 h-10 rounded-[var(--radius-control)] skeleton-gradient skeleton-pulse-slow" />
          <div class="flex-1 space-y-2 pt-1">
            <div class="h-4 w-3/4 rounded skeleton-gradient skeleton-pulse-slow" />
            <div class="h-3 w-1/2 rounded skeleton-gradient skeleton-pulse-slow" />
          </div>
        </div>
        <div class="mt-3 space-y-1.5">
          <div class="h-3 w-full rounded skeleton-gradient skeleton-pulse-slow" />
          <div class="h-3 w-2/3 rounded skeleton-gradient skeleton-pulse-slow" />
        </div>
      </div>
    </div>

    <template v-else>
      <section class="flex flex-col gap-3">
        <div v-if="hasSearch" class="flex items-center gap-2 px-1">
          <UIcon name="lucide:scan-search" class="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
          <h2 class="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
            Results for "{{ searchQuery.trim() }}"
          </h2>
        </div>

        <div v-if="visible.length > 0" class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          <DataCollectionCard
            v-for="item in visible"
            :key="item.tableName"
            :item="item"
            :pinned="isPinned(item.tableName)"
            @open="open"
            @toggle-pin="togglePin"
          />
        </div>

        <div v-else-if="hasSearch" class="surface-card rounded-[var(--radius-card)] flex flex-col items-center justify-center py-16 px-6 text-center">
          <div class="w-12 h-12 rounded-[var(--radius-control)] accent-tile accent-tile-neutral flex items-center justify-center mb-3">
            <UIcon name="lucide:search-x" class="w-6 h-6" />
          </div>
          <h3 class="text-sm font-semibold text-[var(--text-primary)] mb-1">No collections found</h3>
          <p class="text-xs text-[var(--text-tertiary)] max-w-xs">Try a shorter name, table name, or API path like <code class="px-1 py-0.5 rounded bg-[var(--surface-muted)] text-[var(--text-secondary)] font-mono text-[11px]">/users</code></p>
        </div>

        <div v-else-if="catalog.length === 0" class="surface-card rounded-[var(--radius-card)] flex flex-col items-center justify-center py-16 px-6 text-center">
          <div class="w-12 h-12 rounded-[var(--radius-control)] accent-tile accent-tile-neutral flex items-center justify-center mb-3">
            <UIcon name="lucide:database-zap" class="w-6 h-6" />
          </div>
          <h3 class="text-sm font-semibold text-[var(--text-primary)] mb-1">No collections</h3>
          <p class="text-xs text-[var(--text-tertiary)] max-w-xs">No enabled non-system collections are visible to your current role.</p>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
</style>
