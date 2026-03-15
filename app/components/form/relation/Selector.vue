<script setup lang="ts">
const props = defineProps<{
  relationMeta: any;
  selectedIds: any[];
  multiple?: boolean;
  disabled?: boolean;
  open?: boolean;
}>();

const emit = defineEmits(["apply", "update:open"]);

const isDrawerOpen = computed({
  get: () => props.open || false,
  set: (value) => emit("update:open", value),
});

const selected = ref<any[]>([...props.selectedIds]);
const page = ref(1);
const limit = 10;
const showCreateDrawer = ref(false);
const showFilterDrawer = ref(false);
const searchQuery = ref("");
const searchDebounced = ref("");
const { createEmptyFilter, buildQuery, hasActiveFilters } = useFilterQuery();
const currentFilter = ref(createEmptyFilter());
const { schemas } = useSchema();
const { getId, getIdFieldName } = useDatabase();

let searchTimeout: ReturnType<typeof setTimeout> | null = null;

watch(searchQuery, (newVal) => {
  if (searchTimeout) clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    searchDebounced.value = newVal;
    page.value = 1;
  }, 300);
});

const targetTable = computed(() => {
  const targetTableRef = props.relationMeta?.targetTable;
  const targetId = typeof targetTableRef === 'string'
    ? targetTableRef
    : getId(targetTableRef);

  return Object.values(schemas.value).find(
    (schema: any) => getId(schema) === targetId
  ) || null;
});

const targetTableName = computed(() => targetTable.value?.name || "");

const { isMounted } = useMounted();

const { getRouteForTableId, ensureRoutesLoaded } = useRoutes();
const targetRoute = ref<string>('');

watchEffect(async () => {
  const tableId = getId(targetTable.value);
  if (tableId) {
    await ensureRoutesLoaded();
    targetRoute.value = getRouteForTableId(tableId);
  }
});

watch(
  () => props.selectedIds,
  () => {
    selected.value = [...props.selectedIds];
  }
);

const {
  data: apiData,
  pending: loading,
  execute: fetchData,
} = useApi(() => targetRoute.value || `/${targetTable.value?.name}`, {
  query: computed(() => {
    const filterQuery = hasActiveFilters(currentFilter.value)
      ? buildQuery(currentFilter.value)
      : {};

    const query: Record<string, any> = {
      fields: "*",
      page: page.value,
      limit,
      meta: "totalCount,filterCount",
      sort: "-createdAt",
      ...(Object.keys(filterQuery).length > 0 && { filter: filterQuery }),
    };

    if (searchDebounced.value.trim()) {
      query.search = searchDebounced.value.trim();
    }

    return query;
  }),
  errorContext: "Fetch Relation Data",
});

const data = computed(() => {
  return apiData.value?.data || [];
});

const total = computed(() => {
  
  const hasFilters = hasActiveFilters(currentFilter.value);
  if (hasFilters) {
    
    return apiData.value?.meta?.filterCount ?? 0;
  }
  return apiData.value?.meta?.totalCount || 0;
});

watch(total, (newTotal) => {
  const maxPage = Math.ceil(newTotal / limit);
  if (page.value > maxPage && maxPage > 0) {
    page.value = maxPage;
  }
});

function toggle(id: any) {
  if (props.disabled) return;
  if (props.multiple) {
    const found = selected.value.find((s) => getId(s) === id);
    selected.value = found
      ? selected.value.filter((s) => getId(s) !== id)
      : [...selected.value, { [getIdFieldName()]: id }];
  } else {
    
    const isCurrentlySelected = selected.value.some((s) => getId(s) === id);
    selected.value = isCurrentlySelected ? [] : [{ [getIdFieldName()]: id }];
  }
}

function apply() {
  if (props.disabled) return;
  emit("apply", selected.value);
}

function navigateToDetail(item: any) {
  const itemId = getId(item);
  if (!itemId || !targetTableName.value) return;
  const url =
    getDetailPathForTable(targetTableName.value, itemId) ??
    `/data/${targetTableName.value}/${itemId}`;
  window.open(url, "_blank");
}

async function handleFilterApply(filter: FilterGroup) {
  currentFilter.value = filter;
  page.value = 1; 
  await fetchDataWithValidation();
}

const hasSearchOrFilters = computed(() => {
  return searchDebounced.value.trim() !== "" || hasActiveFilters(currentFilter.value);
});

function clearSearch() {
  searchQuery.value = "";
  searchDebounced.value = "";
  page.value = 1;
}

async function clearFilter() {
  currentFilter.value = createEmptyFilter();
  page.value = 1;
  await fetchDataWithValidation();
}

function clearAllFilters() {
  clearSearch();
  currentFilter.value = createEmptyFilter();
  page.value = 1;
}

function openFilterDrawer() {
  showFilterDrawer.value = true;
}

async function fetchDataWithValidation() {
  try {
    await fetchData();

    const maxPage = Math.ceil(total.value / limit);
    if (page.value > maxPage && maxPage > 0) {
      page.value = maxPage;
    }
  } catch (error) {
    console.error("Error fetching relation data:", error);
    
    if (page.value > 1) {
      page.value = 1;
    }
  }
}

watch(
  () => props.open,
  async (newVal) => {
    if (newVal) {
      searchQuery.value = "";
      searchDebounced.value = "";
      await fetchDataWithValidation();
    }
  }
);

watch(page, async (newPage, oldPage) => {
  if (newPage >= 1 && newPage !== oldPage) {
    await fetchDataWithValidation();
  }
});

const { isMobile, isTablet } = useScreen();
</script>

<template>
  
  <CommonDrawer
    :handle="false"
    handle-only
    v-model="isDrawerOpen"
    direction="right"
  >
    <template #header>
      <h2 :class="(isMobile || isTablet) ? 'text-base font-semibold truncate' : 'text-lg'">
        {{ props.relationMeta.propertyName }}
      </h2>
    </template>
      <template #body>
        <div :class="(isMobile || isTablet) ? 'space-y-3' : 'space-y-6'">

          <div
            :class="(isMobile || isTablet) ? 'rounded-lg border border-gray-200 dark:border-gray-700/30 p-3 shadow-sm bg-white dark:bg-gray-800/50' : 'rounded-xl border border-gray-200 dark:border-gray-700/30 p-6 shadow-sm bg-white dark:bg-gray-800/50'"
          >
            <div :class="(isMobile || isTablet) ? 'flex items-center justify-between mb-3' : 'flex items-center justify-between mb-4'">
              <div :class="(isMobile || isTablet) ? 'flex items-center gap-2 min-w-0 flex-1' : 'flex items-center gap-3'">
                <div
                  :class="(isMobile || isTablet) ? 'w-6 h-6 rounded-lg bg-gradient-to-br from-info to-success flex items-center justify-center shadow-md flex-shrink-0' : 'w-8 h-8 rounded-lg bg-gradient-to-br from-info to-success flex items-center justify-center shadow-md'"
                >
                  <UIcon name="lucide:git-fork" :class="(isMobile || isTablet) ? 'text-xs text-white' : 'text-xs text-white'" />
                </div>
                <div class="min-w-0 flex-1">
                  <h3 :class="(isMobile || isTablet) ? 'text-sm font-semibold text-foreground truncate' : 'text-lg font-semibold text-foreground'">
                    Relations
                  </h3>
                  <p :class="(isMobile || isTablet) ? 'text-xs text-muted-foreground truncate' : 'text-sm text-muted-foreground'">
                    {{ targetTable?.name || "Unknown" }} records
                  </p>
                </div>
              </div>

              <FormRelationActions
                :has-active-filters="hasActiveFilters(currentFilter)"
                :filter-count="currentFilter.conditions.length"
                :disabled="props.disabled"
                @open-filter="openFilterDrawer"
                @open-create="showCreateDrawer = true"
              />
            </div>

            <div class="flex items-center gap-2">
              <UBadge v-if="selected.length > 0" variant="soft" color="primary" size="sm">
                {{ selected.length }} selected
              </UBadge>
              <span class="text-xs text-muted-foreground">
                {{
                  props.multiple
                    ? "Multiple selection enabled"
                    : "Single selection"
                }}
              </span>
            </div>
          </div>

          <div class="relative">
            <UInput
              v-model="searchQuery"
              :placeholder="`Search ${targetTable?.name || 'records'}...`"
              :size="(isMobile || isTablet) ? 'sm' : 'md'"
              class="w-full"
            >
              <template #leading>
                <UIcon name="lucide:search" class="text-muted-foreground" />
              </template>
              <template #trailing>
                <UButton
                  v-if="searchQuery"
                  icon="lucide:x"
                  size="xs"
                  variant="ghost"
                  color="neutral"
                  @click="clearSearch"
                />
              </template>
            </UInput>

            <div
              v-if="hasSearchOrFilters"
              class="flex items-center gap-2 mt-2"
            >
              <UBadge
                v-if="searchDebounced"
                variant="soft"
                color="info"
                size="xs"
              >
                Search: "{{ searchDebounced }}"
              </UBadge>
              <UBadge
                v-if="hasActiveFilters(currentFilter)"
                variant="soft"
                color="secondary"
                size="xs"
              >
                {{ currentFilter.conditions.length }} filter(s)
              </UBadge>
              <UButton
                size="xs"
                variant="ghost"
                color="error"
                @click="clearAllFilters"
              >
                Clear all
              </UButton>
            </div>
          </div>

          <div
            :class="(isMobile || isTablet) ? 'bg-gradient-to-r from-background/50 to-muted/10 rounded-lg border border-gray-200 dark:border-gray-700/30 p-3 bg-white dark:bg-gray-800/50' : 'bg-gradient-to-r from-background/50 to-muted/10 rounded-xl border border-gray-200 dark:border-gray-700/30 p-6 bg-white dark:bg-gray-800/50'"
          >

            <CommonLoadingState
              v-if="!isMounted || loading"
              type="form"
              context="inline"
              size="md"
            />

            <CommonEmptyState
              v-else-if="isMounted && !loading && data.length === 0"
              :title="
                hasSearchOrFilters
                  ? 'No results found'
                  : 'No relations available'
              "
              :description="
                hasSearchOrFilters
                  ? 'Try adjusting your search or filters'
                  : 'No relations have been created yet'
              "
              icon="lucide:database"
              size="sm"
              :action="
                hasSearchOrFilters
                  ? {
                      label: 'Clear filters',
                      onClick: clearAllFilters,
                      icon: 'lucide:x',
                    }
                  : undefined
              "
            />

            <FormRelationList
              v-else
              :data="data"
              :selected="selected"
              :multiple="props.multiple"
              :disabled="props.disabled"
              @toggle="toggle"
              @navigate-detail="navigateToDetail"
            />
          </div>
        </div>
      </template>
      <template #footer>
        <div :class="(isMobile || isTablet) ? '' : 'rounded-xl border border-gray-200 dark:border-gray-700/30 p-4 bg-white dark:bg-gray-800/50'">
          <FormRelationPagination
            :page="page"
            :total="total"
            :limit="limit"
            :loading="loading"
            :disabled="props.disabled"
            @update:page="page = $event"
            @apply="apply"
          />
        </div>
      </template>
    </CommonDrawer>

  <FormRelationCreateDrawer
    v-model="showCreateDrawer"
    :relation-meta="props.relationMeta"
    @created="() => fetchData()"
    v-model:selected="selected"
  />

  <FilterDrawerLazy
    v-model="showFilterDrawer"
    :table-name="targetTable?.name || ''"
    :current-filter="currentFilter"
    @apply="handleFilterApply"
  />
</template>
