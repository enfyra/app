<script setup lang="ts">
import { useDataCollectionPreferences } from '~/composables/menu/useDataCollectionPreferences';
import type { ColumnDef } from '@tanstack/vue-table';

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
const { prefs, isPinned, togglePin, addRecent } = useDataCollectionPreferences();
const router = useRouter();

const searchQuery = ref('');
const sortBy = ref<SortMode>('name');
const initialLoading = ref(true);
const page = ref(1);
const pageSize = useSettingsPageSize('data-directory');
const columns: ColumnDef<CollectionItem>[] = [
  { accessorKey: 'label', header: 'Collection', enableSorting: false, meta: { style: { th: { width: '28%' }, td: { width: '28%' } } } },
  { accessorKey: 'apiPath', header: 'API path', enableSorting: false, meta: { style: { th: { width: '24%' }, td: { width: '24%' } } } },
  { accessorKey: 'description', header: 'Description', enableSorting: false },
  { accessorKey: 'isSingleRecord', header: 'Type', enableSorting: false, meta: { style: { th: { width: '100px' }, td: { width: '100px' } } } },
  { id: 'pin', header: '', enableSorting: false, enableHiding: false, meta: { style: { th: { width: '56px' }, td: { width: '56px' } } } },
];

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
const pageRows = computed(() => visible.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value));
watch([searchQuery, sortBy, pageSize], () => { page.value = 1; });
watch(() => visible.value.length, total => {
  page.value = Math.min(page.value, Math.max(1, Math.ceil(total / pageSize.value)));
});

function pin(item: CollectionItem) {
  togglePin(item.tableName);
  page.value = 1;
}

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
  <div class="min-w-0 w-full">
    <DataTable
      v-model:page="page"
      :data="pageRows"
      :columns="columns"
      :loading="isLoading"
      :show-column-visibility="false"
      :get-row-id="item => item.tableName"
      :pagination-config="{ total: visible.length, itemsPerPage: pageSize, showPageSize: true, loading: isLoading }"
      :ui="{ base: 'table-fixed !min-w-[900px]', th: 'px-4 py-3', td: 'max-w-0 overflow-hidden px-4 py-3' }"
      @page-size-change="pageSize = $event"
      @row-click="open($event as CollectionItem)"
    >
      <template #toolbar>
        <DataDirectorySearchBar v-model="searchQuery" v-model:sort-by="sortBy" :total="catalog.length" :match-count="filtered.length" :loading="isLoading" :has-search="hasSearch" />
      </template>
      <template #label-cell="{ row }">
        <div class="flex min-w-0 items-center gap-3">
          <UIcon :name="row.original.icon" class="size-5 shrink-0 text-primary" />
          <div class="min-w-0">
            <span class="block truncate font-medium text-highlighted" :title="row.original.label">{{ row.original.label }}</span>
            <span v-if="row.original.label !== row.original.tableName" class="block truncate font-mono text-xs text-muted" :title="row.original.tableName">{{ row.original.tableName }}</span>
          </div>
        </div>
      </template>
      <template #apiPath-cell="{ row }">
        <span class="block truncate font-mono text-xs text-muted" :title="row.original.apiPath">{{ row.original.apiPath }}</span>
      </template>
      <template #description-cell="{ row }">
        <span class="block truncate text-muted" :title="row.original.description || undefined">{{ row.original.description || '—' }}</span>
      </template>
      <template #isSingleRecord-cell="{ row }">
        <UBadge v-if="row.original.isSingleRecord" label="Single" color="neutral" variant="subtle" size="sm" />
        <span v-else class="text-xs text-muted">Multiple</span>
      </template>
      <template #pin-cell="{ row }">
        <UButton
          :icon="isPinned(row.original.tableName) ? 'lucide:pin' : 'lucide:pin-off'"
          :color="isPinned(row.original.tableName) ? 'primary' : 'neutral'"
          :variant="isPinned(row.original.tableName) ? 'soft' : 'ghost'"
          size="xs"
          :aria-label="`${isPinned(row.original.tableName) ? 'Unpin' : 'Pin'} ${row.original.label}`"
          :aria-pressed="isPinned(row.original.tableName)"
          @click.stop="pin(row.original as CollectionItem)"
        />
      </template>
      <template #empty>
        <CommonEmptyState variant="naked" :title="hasSearch ? 'No collections found' : 'No collections'" :description="hasSearch ? 'Try a collection name, table name, or API path.' : 'No enabled non-system collections are visible to your current role.'" :icon="hasSearch ? 'lucide:search-x' : 'lucide:database-zap'" size="sm" />
      </template>
    </DataTable>
  </div>
</template>
