<script setup lang="ts">
import { onMounted } from 'vue';
import ColumnSelector from "~/components/data-table/ColumnSelector.vue";

const route = useRoute();
const router = useRouter();
const tableName = route.params.table as string;
const { schemas } = useSchema();
const total = ref(1);
const page = ref(1);
const pageLimit = 10;
const data = ref([]);
const { createEmptyFilter, buildQuery, hasActiveFilters } = useFilterQuery();
const { checkPermissionCondition } = usePermissions();
const { getId } = useDatabase();

const showFilterDrawer = ref(false);
const currentFilter = ref(createEmptyFilter());

const { getRouteForTableName, ensureRoutesLoaded } = useRoutes();
const { registerPageHeader } = usePageHeaderRegistry();

onMounted(async () => {
  await ensureRoutesLoaded();
});

watch(() => schemas.value[tableName]?.name || tableName, (name) => {
  if (name) {
    registerPageHeader({
      title: name,
      gradient: "cyan",
    });
  }
}, { immediate: true });

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
  execute: fetchData,
} = useApi(() => getRouteForTableName(tableName), {
  query: computed(() => {
    const filterQuery = hasActiveFilters(currentFilter.value)
      ? buildQuery(currentFilter.value)
      : {};

    return {
      limit: pageLimit,
      page: page.value,
      fields: "*",
      sort: "-createdAt",
      meta: "*",
      ...(Object.keys(filterQuery).length > 0 && { filter: filterQuery }),
    };
  }),
  errorContext: "Fetch Data",
});

const { hiddenColumns, visibleColumns, columnDropdownItems } =
  useDataTableVisibility(tableName, schemas);

const {
  selectedRows,
  isSelectionMode,
  handleDelete,
  handleBulkDelete,
  handleSelectionChange,
} = useDataTableActions(tableName, fetchData, data);

const { isMobile, isTablet } = useScreen();

useSubHeaderActionRegistry([
  {
    id: "toggle-selection",
    label: computed(() =>
      isSelectionMode.value ? "Cancel Selection" : "Select Items"
    ),
    icon: computed(() =>
      isSelectionMode.value ? "lucide:x" : "lucide:check-square"
    ),
    variant: computed(() => (isSelectionMode.value ? "ghost" : "outline")),
    color: computed(() => (isSelectionMode.value ? "error" : "primary")),
    onClick: () => {
      const wasSelectionMode = isSelectionMode.value;
      isSelectionMode.value = !wasSelectionMode;

      if (wasSelectionMode) {
        selectedRows.value = [];
      }
    },
    side: "right",
    show: computed(() => !isMobile.value && !isTablet.value),
    permission: {
      and: [
        {
          route: getRouteForTableName(tableName),
          actions: ["delete"],
        },
      ],
    },
  },
  {
    id: "bulk-delete-selected",
    label: computed(() => `Delete Selected (${selectedRows.value.length})`),
    icon: "lucide:trash-2",
    variant: "solid",
    color: "error",
    side: "right",
    onClick: () => handleBulkDelete(selectedRows.value),
    show: computed(
      () => isSelectionMode.value && selectedRows.value.length > 0
    ),
    permission: {
      and: [
        {
          route: getRouteForTableName(tableName),
          actions: ["delete"],
        },
      ],
    },
  },
  {
    id: "column-picker-component",
    component: ColumnSelector,
    get key() {
      return `column-picker-${Array.from(hiddenColumns.value).join("-")}`;
    },
    get props() {
      return {
        items: columnDropdownItems.value,
        variant: "soft",
        color: "secondary",
      };
    },
    side: "right",
    permission: {
      and: [
        {
          route: getRouteForTableName(tableName),
          actions: ["read"],
        },
      ],
    },
  },
]);

const { buildColumn, buildActionsColumn } = useDataTableColumns();

const columns = computed(() => {
  const schema = schemas.value[tableName];
  if (!schema?.definition) return [];

  const dataColumns = schema.definition
    .filter(
      (field) =>
        field.fieldType === "column" &&
        field.name &&
        visibleColumns.value.has(field.name)
    )
    .sort((a, b) => {
      const aName = a.name?.toLowerCase() || '';
      const bName = b.name?.toLowerCase() || '';
      
      if (aName === 'id' || aName === '_id') return -1;
      if (bName === 'id' || bName === '_id') return 1;

      const aSortKey = a.id ?? (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      const bSortKey = b.id ?? (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      return aSortKey - bSortKey;
    })
    .map((field) => {
      let config: DataTableColumnConfig = {
        id: field.name!,
        header: field.label || field.name || "",
      };

      if (field.type === "timestamp") {
        config.format = "datetime";
      } else if (field.type === "date") {
        config.format = "date";
      } else if (field.type === "boolean") {
        config.format = "badge";
        config.formatOptions = {
          badgeColor: (value: boolean) => (value ? "success" : "neutral"),
          badgeVariant: "soft",
          badgeMap: { true: "Yes", false: "No" },
        };
      } else {
        config.format = "custom";
        config.formatOptions = {
          formatter: (value: unknown) => {
            if (value === null || value === undefined) return "-";
            const str = String(value);
            return str.length > 50 ? str.slice(0, 50) + "..." : str;
          },
        };
      }

      return buildColumn(config);
    });

  const actionsConfig = {
    actions: [
      {
        label: "Delete",
        icon: "lucide:trash-2",
        color: "error",
        show: () => {
          const hasDeletePermission = checkPermissionCondition({
            and: [
              {
                route: getRouteForTableName(tableName),
                actions: ["delete"],
              },
            ],
          });
          return hasDeletePermission;
        },
        onSelect: (row: Record<string, any>) => {
          handleDelete(row.id);
        },
      },
    ],
    width: 80,
  };

  const actionsColumn = buildActionsColumn(actionsConfig);

  return [...dataColumns, actionsColumn];
});

watch(
  apiData,
  (newData) => {
    if (newData?.data) {
      data.value = newData.data;
      const hasFilters = hasActiveFilters(currentFilter.value);
      if (hasFilters) {
        
        total.value = newData.meta?.filterCount ?? 0;
      } else {
        total.value = newData.meta?.totalCount || 0;
      }
    }
  },
  { immediate: true }
);

async function handleFilterApply(filter: FilterGroup) {
  currentFilter.value = filter;

  if (page.value === 1) {
    await fetchData();
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

watch(
  () => route.query.page,
  async (newVal) => {
    page.value = newVal ? Number(newVal) : 1;
    await fetchData();
  },
  { immediate: true }
);

useHeaderActionRegistry([
  {
    id: "filter-data-entries",
    get label() {
      return filterLabel.value;
    },
    icon: "lucide:filter",
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
          route: getRouteForTableName(tableName),
          actions: ["read"],
        },
      ],
    },
  },
  {
    id: "create-data-entry",
    label: "Create",
    icon: "lucide:plus",
    variant: "solid",
    color: "primary",
    size: "md",
    to: `/data/${route.params.table}/create`,
    permission: {
      and: [
        {
          route: getRouteForTableName(tableName),
          actions: ["create"],
        },
      ],
    },
  },
]);
</script>

<template>
  <div class="space-y-6">
    
    <div
      v-if="hasActiveFilters(currentFilter)"
      class="flex items-center gap-2 p-4 rounded-2xl bg-purple-500/10 border border-purple-500/30"
    >
      <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center">
        <UIcon name="i-lucide-filter" class="w-4 h-4 text-white" />
      </div>
      <span class="font-medium text-gray-200">
        {{ currentFilter.conditions.length }} active filter{{ currentFilter.conditions.length > 1 ? 's' : '' }}
      </span>
      <UButton
        icon="i-lucide-x"
        size="xs"
        variant="ghost"
        @click="clearFilters"
        class="ml-auto"
      >
        Clear
      </UButton>
    </div>

    <div class="space-y-6">
      <DataTableLazy
        :data="data"
        :columns="columns"
        :loading="loading"
        :page-size="pageLimit"
        :selectable="isSelectionMode"
        :skeleton-rows="pageLimit"
        @selection-change="handleSelectionChange"
        @row-click="(row: Record<string, any>) => navigateTo(`/data/${tableName}/${getId(row)}`)"
      />

      <div
        v-if="!loading && Math.ceil(total / pageLimit) > 1"
        class="flex items-center justify-between"
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
        <p class="hidden md:block text-sm text-gray-600 dark:text-gray-400">
          Showing <span class="text-gray-700 dark:text-gray-200">{{ (page - 1) * pageLimit + 1 }}-{{ Math.min(page * pageLimit, total) }}</span>
          of <span class="text-gray-700 dark:text-gray-200">{{ total }}</span> results
        </p>
      </div>
    </div>

    <FilterDrawerLazy
      :model-value="showFilterDrawer"
      @update:model-value="showFilterDrawer = $event"
      :table-name="tableName"
      :current-filter="currentFilter"
      @apply="handleFilterApply"
    />
  </div>
</template>
