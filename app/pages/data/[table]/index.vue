<script setup lang="ts">
const { register: registerSubHeaderActions } = useSubHeaderActionRegistry();
const { register: registerHeaderActions } = useHeaderActionRegistry();
import { createSelectionColumn } from '~/utils/data-table-selection';
import { resolveTableCellDisplay } from '~/utils/data-table-cell-formatter';
import { UBadge } from '#components';
import type { RowSelectionState, VisibilityState } from '@tanstack/vue-table';

const route = useRoute();
const router = useRouter();
const tableName = computed(() => route.params.table as string);
const { schemas, schemaReady, getColumnFields } = useSchema(tableName);
const total = ref(1);
const page = ref(1);
const pageLimit = 10;
const data = ref([]);
const { createEmptyFilter, buildQuery, hasActiveFilters, countActiveFilters } = useFilterQuery();
const { checkPermissionCondition } = usePermissions();
const { getId } = useDatabase();
const singleRecordIdMap = useState<Record<string, string>>('singleRecordIdMap', () => ({}));

const showFilterDrawer = ref(false);
const currentFilter = ref(createEmptyFilter());

const { getRouteForTableName, ensureRoutesLoaded } = useRoutes();
const { registerPageHeader } = usePageHeaderRegistry();

const schema = computed(() => schemas.value[tableName.value]);
const isSingleRecord = computed(() => schema.value?.isSingleRecord === true);

const {
  data: singleRecordData,
  execute: fetchSingleRecord,
} = useApi(() => getRouteForTableName(tableName.value), {
  query: computed(() => ({ limit: 1, fields: getColumnFields() })),
  immediate: false,
  errorContext: "Fetch Single Record",
});

watch([schemaReady, tableName, isSingleRecord], async ([ready]) => {
  if (ready && isSingleRecord.value) {
    const table = tableName.value;
    const cachedId = singleRecordIdMap.value[table];
    if (cachedId) {
      navigateTo(`/data/${table}/${cachedId}`, { replace: true });
      return;
    }

    await fetchSingleRecord();

    const records = singleRecordData.value?.data;
    if (records && records.length > 0) {
      const recordId = getId(records[0]);
      singleRecordIdMap.value[table] = recordId;
      navigateTo(`/data/${table}/${recordId}`, { replace: true });
    }
  }
}, { immediate: true });

onMounted(async () => {
  await ensureRoutesLoaded();
});

watch(() => schemas.value[tableName.value]?.name || tableName.value, (name) => {
  if (name) {
    registerPageHeader({
      title: name,
      gradient: "cyan",
    });
  }
}, { immediate: true });

const activeFilterCount = computed(() => countActiveFilters(currentFilter.value));

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
  execute: fetchData,
} = useApi(() => getRouteForTableName(tableName.value), {
  query: computed(() => {
    const filterQuery = hasActiveFilters(currentFilter.value)
      ? buildQuery(currentFilter.value)
      : {};

    return {
      limit: pageLimit,
      page: page.value,
      fields: getColumnFields(),
      sort: "-createdAt",
      meta: "*",
      ...(Object.keys(filterQuery).length > 0 && { filter: filterQuery }),
    };
  }),
  immediate: computed(() => !isSingleRecord.value),
  errorContext: "Fetch Data",
});

const tableLoading = computed(() => !schemaReady.value || loading.value);

const columnVisibility = ref<VisibilityState>({});
watch([tableName, schema], ([name, definition]) => {
  if (!import.meta.client) return;
  const fields = definition?.definition?.filter(field => field.fieldType === 'column' && field.name && field.metadataAccess?.read !== false) ?? [];
  if (!fields.length) return;
  try {
    const savedValue = localStorage.getItem(`columnVisibility_${name}`);
    const saved = savedValue === null ? [] : JSON.parse(savedValue);
    const hidden = new Set<string>(Array.isArray(saved) ? saved : []);
    if (savedValue === null) {
      if (fields.length >= 7) {
        for (const field of fields) {
          if (field.name === 'createdAt' || field.name === 'updatedAt') hidden.add(field.name);
        }
      }
      const visible = fields.filter(field => !hidden.has(field.name!));
      if (fields.length >= 10 && visible.length >= 10) {
        const oldestFirst = [...visible].sort((left, right) => {
          if (left.name?.toLowerCase() === 'id') return -1;
          if (right.name?.toLowerCase() === 'id') return 1;
          const age = (left.createdAt ? new Date(left.createdAt).getTime() : 0)
            - (right.createdAt ? new Date(right.createdAt).getTime() : 0);
          return age || left.name!.localeCompare(right.name!);
        });
        const keep = new Set(oldestFirst.slice(0, 10).map(field => field.name));
        for (const field of visible) if (!keep.has(field.name)) hidden.add(field.name!);
      }
    }
    columnVisibility.value = Object.fromEntries(fields.map(field => [field.name!, !hidden.has(field.name!)]));
  } catch {
    columnVisibility.value = {};
  }
}, { immediate: true });
watch(columnVisibility, visibility => {
  if (!import.meta.client || !schema.value?.definition?.length) return;
  try {
    localStorage.setItem(`columnVisibility_${tableName.value}`, JSON.stringify(
      Object.keys(visibility).filter(name => visibility[name] === false),
    ));
  } catch {}
}, { deep: true });

const {
  selectedRows,
  handleDelete,
  handleBulkDelete,
  handleSelectionChange,
} = useDataTableActions(tableName, fetchData, data);

const rowSelection = ref<RowSelectionState>({});
watch(rowSelection, (selection) => {
  const selected = new Set(Object.keys(selection).filter((id) => selection[id]));
  handleSelectionChange(data.value.filter((row) => selected.has(String(getId(row)))));
});
watch(data, (rows) => {
  const visible = new Set(rows.map((row) => String(getId(row))));
  const retained = Object.keys(rowSelection.value).filter((id) => rowSelection.value[id] && visible.has(id));
  if (retained.length !== Object.keys(rowSelection.value).length) rowSelection.value = Object.fromEntries(retained.map((id) => [id, true]));
  const selected = new Set(retained);
  handleSelectionChange(rows.filter((row) => selected.has(String(getId(row)))));
});


registerSubHeaderActions([
  {
    id: "bulk-delete-selected",
    label: computed(() => `Delete Selected (${selectedRows.value.length})`),
    icon: "lucide:trash-2",
    variant: "solid",
    color: "error",
    side: "right",
    onClick: () => handleBulkDelete(selectedRows.value),
    show: computed(
      () => selectedRows.value.length > 0 && !isSingleRecord.value
    ),
    permission: {
      and: [
        {
          get route() {
            return getRouteForTableName(tableName.value);
          },
          methods: ["DELETE"],
        },
      ],
    },
  },
]);

const { buildActionsColumn } = useDataTableColumns();

const columns = computed(() => {
  const schema = schemas.value[tableName.value];
  if (!schema?.definition) return [];

  const dataColumns = schema.definition
    .filter(
      (field) =>
        field.fieldType === "column" &&
        field.name &&
        field.metadataAccess?.read !== false
    )
    .sort((a, b) => {
      const aName = a.name?.toLowerCase() || '';
      const bName = b.name?.toLowerCase() || '';
      
      if (aName === 'id' || aName === '_id') return -1;
      if (bName === 'id' || bName === '_id') return 1;

      const aSortKey = a.createdAt 
        ? new Date(a.createdAt).getTime() 
        : (a.id ?? Number.MAX_SAFE_INTEGER);
      const bSortKey = b.createdAt 
        ? new Date(b.createdAt).getTime() 
        : (b.id ?? Number.MAX_SAFE_INTEGER);
      return aSortKey - bSortKey;
    })
    .map((field) => {
      const name = field.name!;
      const isId = ['id', '_id'].includes(name.toLowerCase());
      const formatter = field.metadata?.tableCell?.formatter;
      return {
        id: name,
        accessorKey: name,
        header: field.label || name,
        enableSorting: true,
        ...(isId && { size: 84, minSize: 84, maxSize: 220 }),
        cell: ({ getValue }: { getValue: () => unknown }) => {
          const value = getValue();
          if (field.type === 'code' && typeof formatter !== 'string') return value == null || value === '' ? '_' : 'Code';
          const display = resolveTableCellDisplay(field.metadata ?? {}, value);
          return display.color
            ? h(UBadge, { label: display.text, color: display.color, variant: display.variant ?? 'soft' })
            : display.text;
        },
      };
    });

  const actionsConfig = {
    actions: [
      {
        label: "Delete",
        icon: "lucide:trash-2",
        color: "error",
        show: () => {
          if (isSingleRecord.value) return false;
          const hasDeletePermission = checkPermissionCondition({
            and: [
              {
                route: getRouteForTableName(tableName.value),
                methods: ["DELETE"],
              },
            ],
          });
          return hasDeletePermission;
        },
        onSelect: (row: Record<string, any>) => {
          handleDelete(getId(row));
        },
      },
    ],
    width: 80,
  };

  const actionsColumn = buildActionsColumn(actionsConfig);

  return [createSelectionColumn<Record<string, any>>(), ...dataColumns, actionsColumn];
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

watch(tableName, () => {
  total.value = 1;
  currentFilter.value = createEmptyFilter();
  rowSelection.value = {};
});

watch(
  () => [route.query.page, tableName.value, isSingleRecord.value, schemaReady.value] as const,
  async ([newVal, , singleRecord, ready]) => {
    if (!ready || singleRecord) return;
    page.value = newVal ? Number(newVal) : 1;
    await fetchData();
  },
  { immediate: true }
);

registerHeaderActions([
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
        activeFilterCount.value
      }-${hasActiveFilters(currentFilter.value)}`;
    },
    size: "md",
    onClick: () => {
      showFilterDrawer.value = true;
    },
    permission: {
      and: [
        {
          get route() {
            return getRouteForTableName(tableName.value);
          },
          methods: ["GET"],
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
    to: computed(() => `/data/${tableName.value}/create`),
    permission: {
      and: [
        {
          get route() {
            return getRouteForTableName(tableName.value);
          },
          methods: ["POST"],
        },
      ],
    },
  },
]);
</script>

<template>
  <div class="space-y-6">
    <Transition name="loading-fade" mode="out-in">
      <div v-if="!isSingleRecord" key="list" class="space-y-6">

    <div
      v-if="hasActiveFilters(currentFilter)"
    >
      <FilterActiveSummary :count="activeFilterCount" @clear="clearFilters" />
    </div>

    <div class="space-y-6">
      <DataTableLazy
        :data="data"
        :columns="columns"
        :loading="tableLoading"
        :get-row-id="(row: Record<string, any>) => String(getId(row))"
        v-model:row-selection="rowSelection"
        v-model:column-visibility="columnVisibility"
        :skeleton-rows="pageLimit"
        @row-click="(row: Record<string, any>) => navigateTo(`/data/${tableName}/${getId(row)}`)"
      >
        <template #toolbar>
          <span class="text-sm font-medium text-highlighted">{{ tableName }}</span>
          <UBadge color="neutral" variant="subtle" :label="`${total.toLocaleString()} records`" />
        </template>
        <template #footer>
          {{ selectedRows.length }} of {{ data.length }} row(s) selected.
        </template>
      </DataTableLazy>

      <CommonPaginationBar
        v-if="Math.ceil(total / pageLimit) > 1"
        v-model:page="page"
        :items-per-page="pageLimit"
        :total="total"
        :loading="loading"
        :to="(p) => ({ path: route.path, query: { ...route.query, page: p } })"
      />
    </div>

    <FilterDrawerLazy
      :model-value="showFilterDrawer"
      @update:model-value="showFilterDrawer = $event"
      :table-name="tableName"
      :current-filter="currentFilter"
      @apply="handleFilterApply"
    />
      </div>
    </Transition>
  </div>
</template>
