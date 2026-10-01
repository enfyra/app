<template>
  <div class="space-y-6">
    <div class="flex flex-col sm:flex-row gap-3">
      <UInput v-model="search" placeholder="Search routes..." icon="i-lucide-search" size="sm" class="flex-1" />
    </div>

    <CommonTabbedPanel>
      <template #header>
        <UTabs v-model="activeScope" :items="routeTabItems" :content="false" variant="link" />
      </template>
    <DataTableSettingsTable
      v-model:page="page"
      :data="visibleRoutes"
      :columns="columns"
      :loading="showInitialLoading || routeLoading"
      :total="total"
      :page-limit="pageLimit"
      page-size-key="api-tester"
      compact
      :pagination-loading="routeLoading"
      @page-size-change="setPageSize"
      @row-click="openTest"
    />

    </CommonTabbedPanel>

    <RouteApiTestModal
      v-model="showTestModal"
      :route-path="selectedRoute?.path || ''"
      :available-methods="selectedRoute ? getRouteMethods(selectedRoute) : []"
      :public-methods="selectedRoutePublicMethods"
      :handlers="selectedRoute?.handlers"
      :main-table-name="selectedRoute?.mainTable?.name"
      :schemas="schemas"
      :columns="selectedRouteColumns"
    />
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '@tanstack/vue-table';
import { settingsStatusColumn } from '~/utils/settings-table';

definePageMeta({ layout: "default", title: "API Tester" });

const { registerPageHeader } = usePageHeaderRegistry();
const selectedRoute = ref<any>(null);
const showTestModal = ref(false);
const selectedTableName = computed(() => selectedRoute.value?.mainTable?.name || "");
const { schemas } = useSchema(selectedTableName);

registerPageHeader({ title: "API Tester", gradient: "cyan" });

const search = ref('');
const debouncedSearch = ref('');
const pageLimit = useSettingsPageSize('api-tester');
const route = useRoute();
const router = useRouter();
const page = computed({
  get: () => Math.max(1, Number(route.query.page) || 1),
  set: value => { if (value !== page.value) void router.replace({ query: { ...route.query, page: value > 1 ? String(value) : undefined } }); },
});
let searchTimer: ReturnType<typeof setTimeout> | undefined;
watch(search, value => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => { debouncedSearch.value = value.trim(); }, 250);
});
onBeforeUnmount(() => clearTimeout(searchTimer));

const routeFields = 'id,path,isEnabled,isSystem,icon,description,mainTable.id,mainTable.name,availableMethods.name,availableMethods.buttonColor,availableMethods.textColor,publicMethods.name,publicMethods.buttonColor,publicMethods.textColor,handlers.method.name';
type RouteScope = 'custom' | 'system';

function normalizeScope(value: unknown): RouteScope {
  return value === 'system' ? 'system' : 'custom';
}

const activeScope = computed<RouteScope>({
  get: () => normalizeScope(route.query.scope),
  set: value => { void router.replace({ query: { ...route.query, scope: value === 'system' ? 'system' : undefined, page: undefined } }); },
});
function setPageSize(size: number) {
  if (page.value !== 1) {
    void router.replace({ query: { ...route.query, page: undefined } }).then(() => { pageLimit.value = size; });
  } else {
    pageLimit.value = size;
  }
}

const { data: routesData, pending: routeLoading, execute: fetchRoutes } = useApi(
  '/enfyra_route',
  {
    query: computed(() => ({
      fields: routeFields,
      filter: { _and: [
        { isSystem: { _eq: activeScope.value === 'system' } },
        ...(debouncedSearch.value ? [{ _or: [
          { path: { _contains: debouncedSearch.value } },
          { description: { _contains: debouncedSearch.value } },
        ] }] : []),
      ] },
      limit: pageLimit.value,
      page: page.value,
      meta: 'filterCount',
      sort: 'path',
    })),
    errorContext: 'Fetch Routes',
  }
);

const {
  items: routeItems,
  showInitialLoading,
} = useStableListState(() => routesData.value?.data, () => routeLoading.value);
const total = computed(() => routesData.value?.meta?.filterCount ?? 0);
const visibleRoutes = computed(() => routeItems.value);

await fetchRoutes();
watch([activeScope, page, pageLimit, debouncedSearch], (next, previous) => {
  if (page.value > 1 && next[3] !== previous[3]) {
    page.value = 1;
    return;
  }
  void fetchRoutes();
});

function clippedCell(value: string, width: string) {
  return h('span', { class: `block truncate ${width}`, title: value }, value);
}

const columns: ColumnDef<Record<string, any>>[] = [
  { accessorKey: 'path', header: 'Route', enableSorting: false,
    cell: ({ row }) => clippedCell(row.original.path || '_', 'max-w-72 font-medium'),
  },
  { id: 'table', header: 'Table', enableSorting: false,
    cell: ({ row }) => clippedCell(row.original.mainTable?.name || row.original.description || '_', 'max-w-44'),
  },
  { id: 'methods', header: 'Methods', enableSorting: false,
    cell: ({ row }) => clippedCell(getRouteMethods(row.original).map((method: any) => method.name).join(', ') || '_', 'max-w-48'),
  },
  { id: 'publicMethods', header: 'Public', enableSorting: false,
    cell: ({ row }) => String(row.original.publicMethods?.length || 0),
  },
  settingsStatusColumn(),
];

const routeTabItems = computed(() => [
  {
    label: 'Your Routes',
    value: 'custom',
    icon: 'lucide:route',
  },
  {
    label: 'System Routes',
    value: 'system',
    icon: 'lucide:settings',
  },
]);

function getRouteMethods(route: any): any[] {
  const methods = route.availableMethods;
  if (!Array.isArray(methods)) return [];
  return methods.filter((m: any) => m?.name);
}

function openTest(route: any) {
  selectedRoute.value = route;
  showTestModal.value = true;
}

const selectedRoutePublicMethods = computed(() => {
  const methods = selectedRoute.value?.publicMethods;
  if (!Array.isArray(methods)) return [];
  return methods.map((m: any) => m.name).filter(Boolean);
});

const selectedRouteColumns = computed(() => {
  const tableName = selectedRoute.value?.mainTable?.name;
  if (!tableName || !schemas.value?.[tableName]) return [];
  const table = schemas.value[tableName];
  const cols = table.columns || table.fields || [];
  return cols.map((c: any) => c.name || c.propertyName).filter(Boolean);
});
</script>
