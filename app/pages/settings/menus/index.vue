<script setup lang="ts">

const toast = useToast();
const { confirm } = useConfirm();
const page = ref(1);
const pageLimit = 9;
const route = useRoute();
const router = useRouter();
const tableName = "menu_definition";
const { getIncludeFields } = useSchema(tableName);
const { schemas } = useSchema();
const { createEmptyFilter, buildQuery, hasActiveFilters } = useFilterQuery();
const menus = computed(() => apiData.value?.data || []);
const { createLoader } = useLoader();
const { isTablet } = useScreen();
const { isMounted } = useMounted();
const { getId } = useDatabase();
const showFilterDrawer = ref(false);
const currentFilter = ref(createEmptyFilter());

const { registerPageHeader, clearPageHeader } = usePageHeaderRegistry();

const pageIconColor = 'primary';

registerPageHeader({
  title: "Menu Manager",
  description: "Configure and manage navigation menus for your application",
  variant: "default",
  gradient: "purple",
});

onBeforeUnmount(() => {
  clearPageHeader();
});

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
  execute: fetchMenus,
} = useApi(() => "/menu_definition", {
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
  errorContext: "Fetch Menus",
});

const menusData = computed(() => apiData.value?.data || []);
const total = computed(() => {
  
  const hasFilters = hasActiveFilters(currentFilter.value);
  if (hasFilters) {
    
    return apiData.value?.meta?.filterCount ?? 0;
  }
  return apiData.value?.meta?.totalCount || 0;
});

useHeaderActionRegistry([
  {
    id: "filter-menus",
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
    get key() {
      return `filter-${
        currentFilter.value.conditions.length
      }-${hasActiveFilters(currentFilter.value)}`;
    },
    size: "md",
    onClick: () => {
      showFilterDrawer.value = true;
    },
    permission: {
      and: [
        {
          route: "/menu_definition",
          actions: ["read"],
        },
      ],
    },
  },
  {
    id: "create-menu",
    label: "Create Menu",
    icon: "lucide:plus",
    variant: "solid",
    color: "primary",
    size: "md",
    to: "/settings/menus/create",
    permission: {
      and: [
        {
          route: "/menu_definition",
          actions: ["create"],
        },
      ],
    },
  },
]);

const menuLoaders = ref<Record<string, any>>({});

function getMenuLoader(menuId: string) {
  if (!menuLoaders.value[menuId]) {
    menuLoaders.value[menuId] = createLoader();
  }
  return menuLoaders.value[menuId];
}

async function handleFilterApply(filter: FilterGroup) {
  currentFilter.value = filter;
  
  if (page.value === 1) {
    
    await fetchMenus();
  } else {
    
    const newQuery = { ...route.query };
    delete newQuery.page;
    
    await router.replace({
      query: newQuery,
    });
  }
}

async function toggleEnabled(menuItem: any, value?: boolean) {
  const loader = getMenuLoader(menuItem.id);
  const newEnabled = value !== undefined ? value : !menuItem.isEnabled;

  if (apiData.value?.data) {
    const menuIndex = apiData.value.data.findIndex(
      (m: any) => m.id === menuItem.id
    );
    if (menuIndex !== -1) {
      apiData.value.data[menuIndex].isEnabled = newEnabled;
    }
  }

  const { execute: updateSpecificMenu, error: updateError } = useApi(
    () => `/menu_definition/${menuItem.id}`,
    {
      method: "patch",
      errorContext: "Toggle Menu",
    }
  );

  await loader.withLoading(() =>
    updateSpecificMenu({ body: { isEnabled: newEnabled } })
  );

  if (updateError.value) {
    
    if (apiData.value?.data) {
      const menuIndex = apiData.value.data.findIndex(
        (m: any) => m.id === menuItem.id
      );
      if (menuIndex !== -1) {
        apiData.value.data[menuIndex].isEnabled = !newEnabled;
      }
    }
    return;
  }

  const { reregisterAllMenus, registerDataMenuItems } = useMenuRegistry();
  const { fetchMenuDefinitions } = useMenuApi();
  await reregisterAllMenus(fetchMenuDefinitions as any);

  const schemaValues = Object.values(schemas.value);
  if (schemaValues.length > 0) {
    await registerDataMenuItems(schemaValues);
  }

  toast.add({
    title: "Success",
    description: `Menu ${newEnabled ? "enabled" : "disabled"} successfully`,
    color: "success",
  });
}

async function deleteMenu(menuItem: any) {
  const isConfirmed = await confirm({
    title: "Delete Menu",
    content: `Are you sure you want to delete menu "${menuItem.label}"? This action cannot be undone.`,
    confirmText: "Delete",
    cancelText: "Cancel",
  });

  if (isConfirmed) {
    const { execute: deleteMenuApi, error: deleteError } = useApi(
      () => `/menu_definition/${menuItem.id}`,
      {
        method: "delete",
        errorContext: "Delete Menu",
      }
    );

    await deleteMenuApi();

    if (deleteError.value) {
      return;
    }

    await fetchMenus();

    const { reregisterAllMenus, registerDataMenuItems } = useMenuRegistry();
    const { fetchMenuDefinitions } = useMenuApi();
    await reregisterAllMenus(fetchMenuDefinitions as any);

    const schemaValues = Object.values(schemas.value);
    if (schemaValues.length > 0) {
      await registerDataMenuItems(schemaValues);
    }

    toast.add({
      title: "Success",
      description: `Menu "${menuItem.label}" has been deleted successfully!`,
      color: "success",
    });
  }
}

watch(
  () => route.query.page,
  async (newVal) => {
    page.value = newVal ? Number(newVal) : 1;
    await fetchMenus();
  },
  { immediate: true }
);
</script>

<template>
  <div class="space-y-6">
    <Transition name="loading-fade" mode="out-in">
      <CommonLoadingState
        v-if="loading || !isMounted"
        title="Loading menus..."
        description="Fetching menu configuration"
        size="sm"
        type="card"
        context="page"
      />

      <div v-else-if="menus.length" class="space-y-6">
        <div
          class="grid gap-4"
          :class="
            isTablet
              ? 'grid-cols-2'
              : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-2 2xl:grid-cols-3'
          "
        >
          <CommonSettingsCard
            v-for="menu in menus"
            :key="menu.id"
            :title="menu.label"
            :description="menu.path"
            :icon="menu.icon || 'lucide:circle'"
            :icon-color="pageIconColor"
            :card-class="'cursor-pointer transition-all'"
            @click="navigateTo(`/settings/menus/${getId(menu)}`)"
            :stats="[
              {
                label: 'Type',
                component: 'UBadge',
                props: {
                  variant: 'soft',
                  color: menu.type === 'Mini Sidebar' ? 'primary'
                    : menu.type === 'Dropdown Menu' ? 'secondary'
                    : 'neutral',
                },
                value: menu.type === 'Mini Sidebar' ? 'Mini Sidebar'
                  : menu.type === 'Dropdown Menu' ? 'Dropdown Menu'
                  : menu.type === 'Menu' ? 'Menu'
                  : 'Unknown',
              },
              {
                label: 'Status',
                component: 'UBadge',
                props: {
                  variant: 'soft',
                  color: menu.isEnabled ? 'success' : 'warning',
                },
                value: menu.isEnabled ? 'Enabled' : 'Disabled',
              },
              {
                label: 'System',
                component: menu.isSystem ? 'UBadge' : undefined,
                props: menu.isSystem ? { variant: 'soft', color: 'info' } : undefined,
                value: menu.isSystem ? 'System' : '-'
              },
            ]"
            :actions="[
              {
                label: 'Delete',
                props: {
                  icon: 'i-lucide-trash-2',
                  variant: 'solid',
                  color: 'error',
                  size: 'sm',
                },
                disabled: menu.isSystem,
                onClick: (e?: Event) => {
                  e?.stopPropagation();
                  deleteMenu(menu);
                },
              }
            ]"
            :header-actions="[
              ...(menu.isSystem ? [] : [{
                component: 'USwitch',
                props: {
                  'model-value': menu.isEnabled,
                  disabled: getMenuLoader(menu.id).isLoading
                },
                onClick: (e?: Event) => e?.stopPropagation(),
                onUpdate: (value: boolean) => toggleEnabled(menu, value)
              }])
            ]"
          />
        </div>

        <div
          v-if="!loading && menus.length > 0 && total > pageLimit"
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

      <CommonEmptyState
        v-else
        title="No menus found"
        description="No menu configurations have been created yet"
        icon="lucide:navigation"
        size="sm"
      />
    </Transition>
  </div>

  <FilterDrawerLazy
    v-model="showFilterDrawer"
    :table-name="tableName"
    :current-filter="currentFilter"
    @apply="handleFilterApply"
  />
</template>
