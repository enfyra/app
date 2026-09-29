<script setup lang="ts">
const { register: registerSubHeaderActions } = useSubHeaderActionRegistry();
const { register: registerHeaderActions } = useHeaderActionRegistry();
import CommonSystemVisibilityControl from "~/components/common/SystemVisibilityControl.vue";
import type { SystemVisibilityMode } from "~/types/ui";
import type { ColumnDef } from '@tanstack/vue-table';
import type { DataTableRowAction } from '~/types/data-table-columns';
import { settingsStatusColumn, settingsTextColumn } from '~/utils/settings-table';

const notify = useNotify();
const page = ref(1);
const pageLimit = useSettingsPageSize('routes');
const route = useRoute();
const router = useRouter();
const tableName = "enfyra_route";
const { confirm } = useConfirm();
const { createEmptyFilter, buildQuery, hasActiveFilters, countActiveFilters } = useFilterQuery();
const { getLoader: getRouteLoader } = useKeyedLoaders();
const { registerPageHeader } = usePageHeaderRegistry();
const { routes: cachedRoutes, loadRoutes } = useRoutes();
const { registerDataMenuItemsFromRoutes } = useMenuRegistry();
const ROUTE_LIST_FIELDS = [
  "id",
  "path",
  "icon",
  "isSystem",
  "isEnabled",
  "mainTable.id",
  "mainTable.name",
  "availableMethods.id",
  "availableMethods.name",
  "availableMethods.buttonColor",
  "availableMethods.textColor",
  "publicMethods.id",
  "publicMethods.name",
  "publicMethods.buttonColor",
  "publicMethods.textColor",
].join(",");

registerPageHeader({
  title: "Route Manager",
  gradient: "cyan",
});

const { getId } = useDatabase();

const showFilterDrawer = ref(false);
const currentFilter = ref(createEmptyFilter());
const activeFilterCount = computed(() => countActiveFilters(currentFilter.value));
const visibilityScope = ref<SystemVisibilityMode>(getVisibilityScope(route.query.scope, route.query.system));
const showCollectionRoutes = ref(route.query.collectionRoutes === 'true');

function getVisibilityScope(scope: unknown, system: unknown): SystemVisibilityMode {
  if (scope === "custom" || scope === "system" || scope === "all") return scope;
  return system === "true" ? "all" : "custom";
}

watch(() => [route.query.scope, route.query.system], ([scope, system]) => {
  visibilityScope.value = getVisibilityScope(scope, system);
})
watch(() => route.query.collectionRoutes, (v) => { showCollectionRoutes.value = v === 'true' })

watch(visibilityScope, (v) => {
  if (getVisibilityScope(route.query.scope, route.query.system) !== v) {
    const query = { ...route.query }
    delete query.system
    delete query.page
    if (v === "custom") delete query.scope
    else query.scope = v
    router.replace({ query })
  }
})
watch(showCollectionRoutes, (v) => {
  if ((route.query.collectionRoutes === 'true') !== v) {
    const query = { ...route.query }
    delete query.page
    if (v) query.collectionRoutes = 'true'
    else delete query.collectionRoutes
    router.replace({ query })
  }
})

const filterLabel = computed(() => {
  const activeCount = activeFilterCount.value;
  return activeCount > 0 ? `Filters (${activeCount})` : "Filter";
});

const filterVariant = computed(() => {
  return hasActiveFilters(currentFilter.value) ? "solid" : "outline";
});

const filterColor = computed(() => {
  return hasActiveFilters(currentFilter.value) ? "secondary" : "neutral";
});

const {
  data: apiData,
  pending: loading,
  execute: fetchRoutes,
} = useApi(() => "/enfyra_route", {
  query: computed(() => {
    const conditions: any[] = [];
    if (visibilityScope.value === "custom") {
      conditions.push({ isSystem: { _eq: false } });
    } else if (visibilityScope.value === "system") {
      conditions.push({ isSystem: { _eq: true } });
    }
    if (!showCollectionRoutes.value) {
      conditions.push({ mainTable: { _is_null: true } });
    }
    const filterQuery = hasActiveFilters(currentFilter.value)
      ? buildQuery(currentFilter.value)
      : null;
    if (filterQuery) {
      conditions.push(filterQuery);
    }

    return {
      fields: ROUTE_LIST_FIELDS,
      sort: "-createdAt",
      meta: "*",
      page: page.value,
      limit: pageLimit,
      ...(conditions.length > 0 && { filter: { _and: conditions } }),
    };
  }),
  errorContext: "Fetch Routes",
});

const {
  items: routesData,
  showInitialLoading,
} = useStableListState(() => apiData.value?.data, () => loading.value);
const total = computed(() => {
  const meta = apiData.value?.meta
  if (visibilityScope.value === "all" && showCollectionRoutes.value && !hasActiveFilters(currentFilter.value)) {
    return meta?.totalCount ?? 0
  }
  return meta?.filterCount ?? 0
});

registerSubHeaderActions([
  {
    id: "toggle-system-routes",
    component: CommonSystemVisibilityControl,
    get props() {
      return {
        modelValue: visibilityScope.value,
        label: "Routes",
        "onUpdate:modelValue": (value: SystemVisibilityMode) => {
          visibilityScope.value = value;
        },
      };
    },
    side: "right",
    order: 0,
  },
  {
    id: "toggle-collection-routes",
    icon: "lucide:table",
    get label() {
      return showCollectionRoutes.value ? "Hide Collection Routes" : "Collection Routes";
    },
    get variant() {
      return showCollectionRoutes.value ? "solid" as const : "outline" as const;
    },
    get color() {
      return showCollectionRoutes.value ? "info" as const : "neutral" as const;
    },
    size: "md",
    side: "right",
    order: 1,
    onClick: () => {
      showCollectionRoutes.value = !showCollectionRoutes.value;
    },
  },
]);

registerHeaderActions([
  {
    id: "filter-routes",
    icon: "lucide:filter",
    get label() {
      return filterLabel.value;
    },
    get variant() {
      return filterVariant.value;
    },
    get color() {
      return filterColor.value;
    },
    size: "md",
    onClick: () => {
      showFilterDrawer.value = true;
    },
    permission: {
      and: [
        {
          route: "/enfyra_route",
          methods: ["GET"],
        },
      ],
    },
  },
  {
    id: "create-route",
    label: "Create Route",
    icon: "lucide:plus",
    variant: "solid",
    color: "primary",
    size: "md",
    to: "/settings/routes/create",
    permission: {
      and: [
        {
          route: "/enfyra_route",
          methods: ["POST"],
        },
      ],
    },
  },
]);

async function handleFilterApply(filter: FilterGroup) {
  currentFilter.value = filter;
  
  if (page.value === 1) {
    
    await fetchRoutes();
  } else {
    
    const newQuery = { ...route.query };
    delete newQuery.page;
    
    await router.replace({
      query: newQuery,
    });
  }
}

async function clearFilters() {
  await handleFilterApply(createEmptyFilter());
}

async function setPageSize(size: number) {
  if (page.value !== 1) await router.replace({ query: { ...route.query, page: undefined } });
  pageLimit.value = size;
}

watch(() => route.query.page, newVal => { page.value = Math.max(1, Number(newVal) || 1); }, { immediate: true });
watch([page, pageLimit, visibilityScope, showCollectionRoutes], () => { void fetchRoutes(); }, { immediate: true });

const { execute: updateRouteApi, error: updateError } = useApi(
  () => `/enfyra_route`,
  {
    method: "patch",
    errorContext: "Toggle Route",
  }
);

const { execute: deleteRouteApi, error: deleteError } = useApi(
  () => `/enfyra_route`,
  {
    method: "delete",
    errorContext: "Delete Route",
  }
);


const columns: ColumnDef<Record<string, any>>[] = [
  settingsTextColumn('path', 'Route'),
  { id: 'table', header: 'Table', enableSorting: false, cell: ({ row }) => row.original.mainTable?.name || '_' },
  { id: 'methods', header: 'Methods', enableSorting: false,
    cell: ({ row }) => (row.original.availableMethods || []).map((method: any) => method.name).filter(Boolean).join(', ') || '_',
  },
  { id: 'publicMethods', header: 'Public', enableSorting: false,
    cell: ({ row }) => {
      const available = new Set((row.original.availableMethods || []).map((method: any) => method.name));
      return (row.original.publicMethods || []).map((method: any) => method.name).filter((name: string) => available.has(name)).join(', ') || '_';
    },
  },
  settingsStatusColumn(),
];

function canMutateRoute(routeItem: Record<string, any>) {
  return !routeItem.isSystem && getId(routeItem.mainTable) == null;
}

function getRowActions(routeItem: Record<string, any>): DataTableRowAction[] {
  const disabled = !canMutateRoute(routeItem);
  return [
    {
      label: routeItem.isEnabled ? 'Disable' : 'Enable', icon: routeItem.isEnabled ? 'lucide:power-off' : 'lucide:power',
      disabled: disabled || getRouteLoader(getId(routeItem)).isLoading.value,
      onSelect: () => toggleEnabled(routeItem),
    },
    {
      label: 'Delete', icon: 'lucide:trash-2', color: 'error', disabled,
      onSelect: () => deleteRoute(routeItem),
    },
  ];
}

async function toggleEnabled(routeItem: any) {
  if (!canMutateRoute(routeItem)) return;

  const newEnabled = !routeItem.isEnabled;

  if (apiData.value?.data) {
    const routeIndex = apiData.value.data.findIndex(
      (r: any) => getId(r) === getId(routeItem)
    );
    if (routeIndex !== -1) {
      apiData.value.data[routeIndex].isEnabled = newEnabled;
    }
  }

  await updateRouteApi({ id: getId(routeItem), body: { isEnabled: newEnabled } });

  if (updateError.value) {
    
    if (apiData.value?.data) {
      const routeIndex = apiData.value.data.findIndex(
        (r: any) => getId(r) === getId(routeItem)
      );
      if (routeIndex !== -1) {
        apiData.value.data[routeIndex].isEnabled = !newEnabled;
      }
    }
    return;
  }

  await loadRoutes();
  registerDataMenuItemsFromRoutes(cachedRoutes.value);

  notify.success("Success", `Route ${newEnabled ? "enabled" : "disabled"} successfully`);
}

async function deleteRoute(routeItem: any) {
  if (!canMutateRoute(routeItem)) return;
  const isConfirmed = await confirm({
    title: "Delete Route",
    content: `Are you sure you want to delete route "${routeItem.path}"? This action cannot be undone.`,
    confirmText: "Delete",
    cancelText: "Cancel",
  });

  if (isConfirmed) {
    await deleteRouteApi({ id: getId(routeItem) });

    if (deleteError.value) {
      return;
    }

    await fetchRoutes();

    await loadRoutes();
    registerDataMenuItemsFromRoutes(cachedRoutes.value);

    notify.success("Success", `Route "${routeItem.path}" has been deleted successfully!`);
  }
}

</script>

<template>
  <div class="space-y-6">
    <FilterActiveSummary
      v-if="hasActiveFilters(currentFilter)"
      :count="activeFilterCount"
      @clear="clearFilters"
    />

    <DataTableSettingsTable
      v-model:page="page"
      :data="routesData"
      :columns="columns"
      :actions="getRowActions"
      :loading="showInitialLoading"
      :total="total"
      :page-limit="pageLimit"
      page-size-key="routes"
      :pagination-loading="loading"
      :to="(p) => ({ path: route.path, query: { ...route.query, page: p } })"
      @page-size-change="setPageSize"
      @row-click="routeItem => navigateTo(`/settings/routes/${getId(routeItem)}`)"
    />

    <FilterDrawerLazy
      v-model="showFilterDrawer"
      :table-name="tableName"
      :current-filter="currentFilter"
      @apply="handleFilterApply"
    />
  </div>
</template>
