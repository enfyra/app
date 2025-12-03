<script setup lang="ts">
const toast = useToast();
const page = ref(1);
const pageLimit = 9;
const route = useRoute();
const router = useRouter();
const tableName = "route_definition";
const { confirm } = useConfirm();
const { getIncludeFields } = useSchema(tableName);
const { createEmptyFilter, buildQuery, hasActiveFilters } = useFilterQuery();
const { createLoader } = useLoader();
const { isTablet } = useScreen();
const { isMounted } = useMounted();
const { registerPageHeader } = usePageHeaderRegistry();

// Fixed color for routing infrastructure
const pageIconColor = 'primary';

registerPageHeader({
  title: "Routing Manager",
  gradient: "cyan",
});

// Helper to get id from both SQL (id) and MongoDB (_id)
const { getId } = useDatabase();

const showFilterDrawer = ref(false);
const currentFilter = ref(createEmptyFilter());

const filterLabel = computed(() => {
  const activeCount = currentFilter.value.conditions.length;
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
} = useApi(() => "/route_definition", {
  query: computed(() => {
    const filterQuery = hasActiveFilters(currentFilter.value)
      ? buildQuery(currentFilter.value)
      : {};

    return {
      fields: getIncludeFields(),
      sort: "-createdAt",
      meta: "*",
      page: page.value,
      limit: pageLimit,
      ...(Object.keys(filterQuery).length > 0 && { filter: filterQuery }),
    };
  }),
  errorContext: "Fetch Routes",
});

const routesData = computed(() => apiData.value?.data || []);
const total = computed(() => {
  // Use filterCount when there are active filters, otherwise use totalCount
  const hasFilters = hasActiveFilters(currentFilter.value);
  if (hasFilters) {
    // When filtering, use filterCount even if it's 0
    return apiData.value?.meta?.filterCount ?? 0;
  }
  return apiData.value?.meta?.totalCount || 0;
});

useHeaderActionRegistry([
  {
    id: "filter-routings",
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
          route: "/route_definition",
          actions: ["read"],
        },
      ],
    },
  },
  {
    id: "create-routing",
    label: "Create Route",
    icon: "lucide:plus",
    variant: "solid",
    color: "primary",
    size: "md",
            to: "/settings/routings/create",
    permission: {
      and: [
        {
          route: "/route_definition",
          actions: ["create"],
        },
      ],
    },
  },
]);

// Update routes when data changes


// Handle filter apply from FilterDrawer
async function handleFilterApply(filter: FilterGroup) {
  currentFilter.value = filter;
  
  if (page.value === 1) {
    // Already on page 1 → fetch directly
    await fetchRoutes();
  } else {
    // On other page → go to page 1, watch will trigger
    const newQuery = { ...route.query };
    delete newQuery.page;
    
    await router.replace({
      query: newQuery,
    });
  }
}

watch(
  () => route.query.page,
  async (newVal) => {
    page.value = newVal ? Number(newVal) : 1;
    await fetchRoutes();
  },
  { immediate: true }
);

// Update API at setup level
const { execute: updateRouteApi, error: updateError } = useApi(
  () => `/route_definition`,
  {
    method: "patch",
    errorContext: "Toggle Route",
  }
);

const { execute: deleteRouteApi, error: deleteError } = useApi(
  () => `/route_definition`,
  {
    method: "delete",
    errorContext: "Delete Route",
  }
);

// Create loaders for each route toggle button
const routeLoaders = ref<Record<string, any>>({});

function getRouteLoader(routeId: string) {
  if (!routeLoaders.value[routeId]) {
    routeLoaders.value[routeId] = createLoader();
  }
  return routeLoaders.value[routeId];
}

function getRouteHeaderActions(routeItem: any) {
  if (routeItem.isSystem) {
    return [];
  }

  // Check if route has associated table
  const hasAssociatedTable = getId(routeItem.mainTable);
  const { schemas } = useSchema();
  const tableExists = hasAssociatedTable && Object.values(schemas.value).some(
    (table: any) => getId(table) === getId(routeItem.mainTable)
  );

  return [
    {
      component: 'USwitch',
      props: {
        'model-value': routeItem.isEnabled,
        disabled: getRouteLoader(getId(routeItem)).isLoading || tableExists
      },
      onClick: (e?: Event) => e?.stopPropagation(),
      onUpdate: () => toggleEnabled(routeItem),
      tooltip: tableExists ? 'Cannot disable route with associated table' : undefined
    }
  ];
}

function getRouteFooterActions(routeItem: any) {
  // Check if route has associated table
  const hasAssociatedTable = getId(routeItem.mainTable);
  const { schemas } = useSchema();
  const tableExists = hasAssociatedTable && Object.values(schemas.value).some(
    (table: any) => getId(table) === getId(routeItem.mainTable)
  );

  return [
    {
      label: 'Delete',
      props: {
        icon: 'i-lucide-trash-2',
        variant: 'solid',
        color: 'error',
        size: 'sm',
      },
      disabled: routeItem.isSystem || tableExists,
      onClick: (e?: Event) => {
        e?.stopPropagation();
        deleteRoute(routeItem);
      },
    }
  ];
}

async function toggleEnabled(routeItem: any) {
  // Optimistic update - change UI immediately
  const newEnabled = !routeItem.isEnabled;

  // Update directly in apiData to trigger reactivity
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
    // Revert optimistic update on error
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

  // Reload routes and reregister menus after route toggle
  const { loadRoutes } = useRoutes();
  const { registerDataMenuItems } = useMenuRegistry();
  const { schemas } = useSchema();

  await loadRoutes();
  await registerDataMenuItems(Object.values(schemas.value));

  toast.add({
    title: "Success",
    description: `Route ${newEnabled ? "enabled" : "disabled"} successfully`,
    color: "success",
  });
}

async function deleteRoute(routeItem: any) {
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

    // Reload routes and reregister menus after route deletion
    const { loadRoutes } = useRoutes();
    const { registerDataMenuItems } = useMenuRegistry();
    const { schemas } = useSchema();

    await loadRoutes();
    await registerDataMenuItems(Object.values(schemas.value));

    toast.add({
      title: "Success",
      description: `Route "${routeItem.path}" has been deleted successfully!`,
      color: "success",
    });
  }
}

</script>

<template>
  <div class="space-y-6">
    <Transition name="loading-fade" mode="out-in">
      <div v-if="loading || !isMounted">
        <CommonLoadingState
          title="Loading routes..."
          description="Fetching routing configuration"
          size="sm"
          type="card"
          context="page"
        />
      </div>

      <div v-else class="space-y-6">
        <div v-if="routesData.length" class="space-y-6">
          <div
            class="grid gap-4"
            :class="
              isTablet
                ? 'grid-cols-2'
                : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-2 2xl:grid-cols-3'
            "
          >
            <CommonSettingsCard
              v-for="routeItem in routesData"
              :key="getId(routeItem)"
              :title="routeItem.path"
              :description="routeItem.mainTable?.name"
              :icon="routeItem.icon || 'lucide:circle'"
              :icon-color="pageIconColor"
              :card-class="'cursor-pointer transition-all'"
              @click="navigateTo(`/settings/routings/${getId(routeItem)}`)"
              :stats="[
                {
                  label: 'Status',
                  component: 'UBadge',
                  props: {
                    variant: 'soft',
                    color: routeItem.isEnabled ? 'success' : 'warning',
                  },
                  value: routeItem.isEnabled ? 'Enabled' : 'Disabled'
                },
                {
                  label: 'System',
                  component: routeItem.isSystem ? 'UBadge' : undefined,
                  props: routeItem.isSystem ? { variant: 'soft', color: 'info' } : undefined,
                  value: routeItem.isSystem ? 'System' : '-'
                },
                {
                  label: 'Published Methods',
                  component: routeItem.publishedMethods?.length ? 'UBadge' : undefined,
                  values: routeItem.publishedMethods?.length ?
                    routeItem.publishedMethods
                      .filter((m: any) => m?.method)
                      .map((m: any) => ({
                        value: m.method.toUpperCase(),
                        props: {
                          color: m.method === 'GET' ? 'info' :
                                 m.method === 'POST' ? 'success' :
                                 m.method === 'PATCH' ? 'warning' :
                                 m.method === 'DELETE' ? 'error' : undefined
                        }
                      })) : undefined,
                  value: !routeItem.publishedMethods?.length ? '-' : undefined
                }
              ]"
              :actions="getRouteFooterActions(routeItem)"
              :header-actions="getRouteHeaderActions(routeItem)"
            </CommonSettingsCard>
          </div>
        </div>

        <CommonEmptyState
          v-else-if="!loading"
          title="No routes found"
          description="No routing configurations have been created yet"
          icon="lucide:route"
          size="sm"
        />

        <!-- Premium Pagination -->
        <div
          v-if="!loading && routesData.length > 0 && total > pageLimit"
          class="flex items-center justify-between mt-6"
        >
          <UPagination
            v-model:page="page"
            :items-per-page="pageLimit"
            :total="total"
            show-edges
            :sibling-count="1"
            :to="
              (p) => ({
                path: route.path,
                query: { ...route.query, page: p },
              })
            "
            :ui="{
              item: 'h-9 w-9 rounded-xl transition-all duration-300',
            }"
          />
          <p class="hidden md:block text-sm text-gray-400">
            Showing <span class="text-gray-700 dark:text-gray-200">{{ (page - 1) * pageLimit + 1 }}-{{ Math.min(page * pageLimit, total) }}</span> of <span class="text-gray-700 dark:text-gray-200">{{ total }}</span> results
          </p>
        </div>
      </div>
    </Transition>
  </div>

  <!-- Filter Drawer -->
  <FilterDrawerLazy
    v-model="showFilterDrawer"
    :table-name="tableName"
    :current-filter="currentFilter"
    @apply="handleFilterApply"
  />
</template>
