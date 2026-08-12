<script setup lang="ts">
import { resolveRelationDetailPath } from '~/utils/relation-detail-paths';

const props = defineProps<{
  relationMeta: any;
  selectedIds: any[];
  multiple?: boolean;
  disabled?: boolean;
  open?: boolean;
}>();

const emit = defineEmits(["apply", "update:open"]);

const LIST_LIMIT = 10;
const SELECTED_PREVIEW_LIMIT = 5;

const isDrawerOpen = computed({
  get: () => props.open || false,
  set: (value) => emit("update:open", value),
});

const selected = ref<any[]>([...props.selectedIds]);
const selectedRecords = ref<any[]>([]);
const selectedExpandedLimit = ref(0);
const pendingRemoval = ref<any | null>(null);
const normalRecords = ref<any[]>([]);
const selectedLoading = ref(false);
const normalLoading = ref(false);
const showSelected = ref(false);
const showCreateDrawer = ref(false);
const showFilterDrawer = ref(false);
const searchQuery = ref("");
const searchDebounced = ref("");
const normalPointer = ref<any>(null);
const pointerHistory = ref<any[]>([]);
const hasMoreNormal = ref(true);
const requestSequence = ref(0);
const { createEmptyFilter, buildQuery, hasActiveFilters, countActiveFilters } = useFilterQuery();
const currentFilter = ref(createEmptyFilter());
const activeFilterCount = computed(() => countActiveFilters(currentFilter.value));
const { getId, getIdFieldName } = useDatabase();
const targetTableName = computed(() => props.relationMeta?.targetTableName || "");
const targetRoute = computed(() => `/${targetTableName.value}`);
const { getColumnFields } = useSchema(targetTableName);
const { isMounted } = useMounted();

let searchTimeout: ReturnType<typeof setTimeout> | null = null;

const idField = computed(() => getIdFieldName());
const selectedIds = computed(() => {
  const seen = new Set<string>();
  return selected.value.filter((item) => {
    const id = getId(item);
    if (id === null || id === undefined || seen.has(String(id))) return false;
    seen.add(String(id));
    return true;
  });
});
const selectedIdValues = computed(() => selectedIds.value.map((item) => getId(item)));
const selectedVisibleRecords = computed(() => {
  if (!showSelected.value) return [];
  return selectedRecords.value.slice(0, selectedExpandedLimit.value || SELECTED_PREVIEW_LIMIT);
});
const selectedOverflowCount = computed(() => Math.max(0, selectedRecords.value.length - selectedVisibleRecords.value.length));
const loading = computed(() => selectedLoading.value || normalLoading.value);
const canLoadMore = computed(() => hasMoreNormal.value && !loading.value);

function getBaseFilter(): Record<string, any> | null {
  return hasActiveFilters(currentFilter.value) ? buildQuery(currentFilter.value) : null;
}

function getNormalFilter(pointer = normalPointer.value): Record<string, any> {
  const conditions: Record<string, any>[] = [];
  const baseFilter = getBaseFilter();
  if (baseFilter && Object.keys(baseFilter).length > 0) conditions.push(baseFilter);
  if (selectedIdValues.value.length > 0) {
    conditions.push({ [idField.value]: { _not_in: selectedIdValues.value } });
  }
  if (pointer !== null && pointer !== undefined) {
    conditions.push({ [idField.value]: { _lt: pointer } });
  }

  if (conditions.length === 0) return {};
  if (conditions.length === 1) return conditions[0] ?? {};
  return { _and: conditions };
}

async function fetchRecords(query: Record<string, any>) {
  return await $fetch<any>(`/api${targetRoute.value}`, { query });
}

async function refreshRecords({ reset = false } = {}) {
  if (!targetTableName.value) return;
  if (reset) {
    normalPointer.value = null;
    pointerHistory.value = [];
    normalRecords.value = [];
    hasMoreNormal.value = true;
  }

  const sequence = ++requestSequence.value;
  const fields = await getColumnFields();
  const selectedQuery = selectedIdValues.value.length > 0
    ? {
        fields,
        filter: { [idField.value]: { _in: selectedIdValues.value } },
        limit: selectedIdValues.value.length,
      }
    : null;
  const normalQuery = {
    fields,
    filter: getNormalFilter(reset ? null : normalPointer.value),
    sort: `-${idField.value}`,
    limit: LIST_LIMIT + 1,
  };

  selectedLoading.value = !!selectedQuery;
  normalLoading.value = true;
  try {
    const [selectedResponse, normalResponse] = await Promise.all([
      selectedQuery ? fetchRecords(selectedQuery) : Promise.resolve({ data: [] }),
      fetchRecords(normalQuery),
    ]);
    if (sequence !== requestSequence.value) return;

    const selectedById = new Map((selectedResponse?.data || []).map((item: any) => [String(getId(item)), item]));
    selectedRecords.value = selectedIds.value.map((item) => selectedById.get(String(getId(item))) || item);

    const normalData = normalResponse?.data || [];
    normalRecords.value = normalData.slice(0, LIST_LIMIT);
    hasMoreNormal.value = normalData.length > LIST_LIMIT;
  } finally {
    if (sequence === requestSequence.value) {
      selectedLoading.value = false;
      normalLoading.value = false;
    }
  }
}

async function loadMore() {
  if (!canLoadMore.value || normalRecords.value.length === 0) return;
  const nextPointer = getId(normalRecords.value[normalRecords.value.length - 1]);
  if (nextPointer === null || nextPointer === undefined) return;

  pointerHistory.value = [...pointerHistory.value, normalPointer.value];
  normalPointer.value = nextPointer;
  await refreshRecords();
}

async function loadPrevious() {
  if (pointerHistory.value.length === 0 || loading.value) return;
  normalPointer.value = pointerHistory.value[pointerHistory.value.length - 1] ?? null;
  pointerHistory.value = pointerHistory.value.slice(0, -1);
  await refreshRecords();
}

function toggle(item: any) {
  if (props.disabled) return;
  const id = getId(item);
  if (id === null || id === undefined) return;

  const isCurrentlySelected = selected.value.some((candidate) => getId(candidate) === id);
  if (isCurrentlySelected) {
    pendingRemoval.value = item;
    return;
  }

  selected.value = props.multiple ? [...selected.value, item] : [item];
  void refreshRecords({ reset: true });
}

function confirmRemoval() {
  if (!pendingRemoval.value) return;
  const id = getId(pendingRemoval.value);
  selected.value = selected.value.filter((candidate) => getId(candidate) !== id);
  pendingRemoval.value = null;
  void refreshRecords({ reset: true });
}

function cancelRemoval() {
  pendingRemoval.value = null;
}

function toggleSelectedSection() {
  showSelected.value = !showSelected.value;
  selectedExpandedLimit.value = showSelected.value ? SELECTED_PREVIEW_LIMIT : 0;
}

function expandSelectedSection() {
  showSelected.value = true;
  selectedExpandedLimit.value = Math.max(
    SELECTED_PREVIEW_LIMIT,
    selectedExpandedLimit.value + SELECTED_PREVIEW_LIMIT,
  );
}

function apply() {
  if (!props.disabled) emit("apply", selected.value);
}

function getDetailPath(item: any): string | null {
  if (!targetTableName.value) return null;
  const url = resolveRelationDetailPath(targetTableName.value, item);
  if (url) return url;
  const itemId = getId(item);
  return itemId ? `/data/${targetTableName.value}/${itemId}` : null;
}

async function handleFilterApply(filter: FilterGroup) {
  currentFilter.value = filter;
  await refreshRecords({ reset: true });
}

const hasSearchOrFilters = computed(() => searchDebounced.value.trim() !== "" || hasActiveFilters(currentFilter.value));

function clearSearch() {
  searchQuery.value = "";
  searchDebounced.value = "";
  void refreshRecords({ reset: true });
}

function clearAllFilters() {
  searchQuery.value = "";
  searchDebounced.value = "";
  currentFilter.value = createEmptyFilter();
  void refreshRecords({ reset: true });
}

watch(searchQuery, (newVal) => {
  if (searchTimeout) clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    searchDebounced.value = newVal;
    void refreshRecords({ reset: true });
  }, 300);
});

watch(() => props.selectedIds, () => {
  selected.value = [...props.selectedIds];
  void refreshRecords({ reset: true });
});

watch(() => props.open, (open) => {
  if (!open) return;
  searchQuery.value = "";
  searchDebounced.value = "";
  void refreshRecords({ reset: true });
});

const { isMobile, isTablet } = useScreen();
</script>

<template>
  <CommonDrawer :handle="false" v-model="isDrawerOpen" direction="right">
    <template #header>
      <h2 :class="(isMobile || isTablet) ? 'text-base font-semibold truncate' : 'text-lg'">
        {{ props.relationMeta.propertyName }}
      </h2>
    </template>

    <template #body>
      <div :class="(isMobile || isTablet) ? 'space-y-3' : 'space-y-6'">
        <div :class="(isMobile || isTablet) ? 'rounded-lg surface-card p-3' : 'rounded-xl surface-card p-6'">
          <div :class="(isMobile || isTablet) ? 'flex items-center justify-between mb-3' : 'flex items-center justify-between mb-4'">
            <div :class="(isMobile || isTablet) ? 'flex items-center gap-2 min-w-0 flex-1' : 'flex items-center gap-3'">
              <div :class="(isMobile || isTablet) ? 'accent-tile accent-tile-primary flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg shadow-theme-xs' : 'accent-tile accent-tile-primary flex h-8 w-8 items-center justify-center rounded-lg shadow-theme-xs'">
                <UIcon name="lucide:git-fork" class="text-xs text-current" />
              </div>
              <div class="min-w-0 flex-1">
                <h3 :class="(isMobile || isTablet) ? 'text-sm font-semibold text-foreground truncate' : 'text-lg font-semibold text-foreground'">Relations</h3>
                <p :class="(isMobile || isTablet) ? 'text-xs text-muted-foreground truncate' : 'text-sm text-muted-foreground'">{{ targetTableName || 'Unknown' }} records</p>
              </div>
            </div>
            <FormRelationActions
              :has-active-filters="hasActiveFilters(currentFilter)"
              :filter-count="activeFilterCount"
              :disabled="props.disabled"
              @open-filter="showFilterDrawer = true"
              @open-create="showCreateDrawer = true"
            />
          </div>

          <div class="flex items-center gap-2">
            <UBadge v-if="selected.length > 0" variant="soft" color="primary" size="sm">{{ selected.length }} selected</UBadge>
            <span class="text-xs text-muted-foreground">{{ props.multiple ? 'Multiple selection enabled' : 'Single selection' }}</span>
          </div>
        </div>

        <div v-if="selectedRecords.length > 0" class="flex items-center gap-2 rounded-lg border border-[var(--border-default)] bg-[var(--surface-muted)] px-3 py-2">
          <button type="button" class="flex min-w-0 flex-1 items-center gap-2 text-left" @click="toggleSelectedSection">
            <UIcon :name="showSelected ? 'lucide:chevron-down' : 'lucide:chevron-right'" class="h-4 w-4 shrink-0 text-muted-foreground" />
            <span class="text-sm font-medium">Selected</span>
            <UBadge variant="soft" color="primary" size="xs">{{ selectedRecords.length }}</UBadge>
            <span v-if="showSelected && selectedOverflowCount > 0" class="truncate text-xs text-muted-foreground">{{ selectedVisibleRecords.length }} shown</span>
          </button>
          <UButton
            v-if="selectedOverflowCount > 0"
            size="xs"
            variant="ghost"
            color="primary"
            @click="expandSelectedSection"
          >
            +{{ Math.min(SELECTED_PREVIEW_LIMIT, selectedOverflowCount) }}
          </UButton>
        </div>

        <div v-if="showSelected && selectedRecords.length > 0" class="max-h-48 overflow-y-auto rounded-lg border border-[var(--border-default)] bg-[var(--surface-default)] p-2">
          <FormRelationList
            :data="selectedVisibleRecords"
            :selected="selected"
            :multiple="props.multiple"
            :disabled="props.disabled"
            :get-detail-path="getDetailPath"
            @toggle="toggle"
          />
        </div>

        <div class="relative">
          <UInput v-model="searchQuery" :placeholder="`Search ${targetTableName || 'records'}...`" :size="(isMobile || isTablet) ? 'sm' : 'md'" class="w-full">
            <template #leading><UIcon name="lucide:search" class="text-muted-foreground" /></template>
            <template #trailing><UButton v-if="searchQuery" icon="lucide:x" size="xs" variant="ghost" color="neutral" @click="clearSearch" /></template>
          </UInput>

          <div v-if="hasSearchOrFilters" class="mt-2 flex items-center gap-2">
            <UBadge v-if="searchDebounced" variant="soft" color="info" size="xs">Search: "{{ searchDebounced }}"</UBadge>
            <FilterActiveSummary v-if="hasActiveFilters(currentFilter)" :count="activeFilterCount" variant="inline" :clearable="false" />
            <UButton size="xs" variant="ghost" color="error" @click="clearAllFilters">Clear all</UButton>
          </div>
        </div>

        <div :class="(isMobile || isTablet) ? 'bg-gradient-to-r from-background/50 to-muted/10 rounded-lg border border-[var(--border-default)] p-3 bg-[var(--surface-default)]' : 'bg-gradient-to-r from-background/50 to-muted/10 rounded-xl border border-[var(--border-default)] p-6 bg-[var(--surface-default)]'">
          <CommonLoadingState v-if="!isMounted || loading" type="form" context="inline" size="md" />
          <CommonEmptyState
            v-else-if="normalRecords.length === 0"
            variant="naked"
            :title="hasSearchOrFilters ? 'No results found' : 'No relations available'"
            :description="hasSearchOrFilters ? 'Try adjusting your search or filters' : 'No relations have been created yet'"
            icon="lucide:database"
            size="sm"
            :action="hasSearchOrFilters ? { label: 'Clear filters', onClick: clearAllFilters, icon: 'lucide:x' } : undefined"
          />
          <FormRelationList
            v-else
            :data="normalRecords"
            :selected="selected"
            :multiple="props.multiple"
            :disabled="props.disabled"
            :get-detail-path="getDetailPath"
            @toggle="toggle"
          />
        </div>
      </div>
    </template>

    <template #footer>
      <div :class="(isMobile || isTablet) ? '' : 'surface-card rounded-xl p-4'">
        <FormRelationPagination
          :can-go-previous="pointerHistory.length > 0"
          :can-go-next="canLoadMore"
          :loading="loading"
          :disabled="props.disabled"
          @previous="loadPrevious"
          @next="loadMore"
          @apply="apply"
        />
      </div>
    </template>
  </CommonDrawer>

  <FormRelationCreateDrawer
    v-model="showCreateDrawer"
    :relation-meta="props.relationMeta"
    :selected="selected"
    @created="() => refreshRecords({ reset: true })"
    @update:selected="selected = $event"
  />

  <FilterDrawerLazy v-model="showFilterDrawer" :table-name="targetTableName" :current-filter="currentFilter" @apply="handleFilterApply" />

  <CommonModal :open="pendingRemoval !== null" @update:open="(open) => !open && cancelRemoval()">
    <template #header>Remove selected record</template>
    <p>Remove {{ getId(pendingRemoval) ?? 'this record' }} from the selection?</p>
    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton variant="ghost" color="neutral" @click="cancelRemoval">Keep selected</UButton>
        <UButton color="error" @click="confirmRemoval">Remove</UButton>
      </div>
    </template>
  </CommonModal>
</template>
