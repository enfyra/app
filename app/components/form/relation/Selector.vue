<script setup lang="ts">
import { resolveRelationDetailPath } from '~/utils/relation-detail-paths';
import { buildRelationSearchFilter, getRelationId } from '~/utils/relation-records';
import type { RelationId } from '~/types/relation';

const props = defineProps<{
  relationMeta: any;
  selectedIds: RelationId[];
  multiple?: boolean;
  disabled?: boolean;
  open?: boolean;
}>();

const emit = defineEmits(["apply", "update:open"]);
const { getId, getIdFieldName } = useDatabase();

const LIST_LIMIT = 10;
const SELECTED_PREVIEW_LIMIT = 5;

const isDrawerOpen = computed({
  get: () => props.open || false,
  set: (value) => emit("update:open", value),
});

const draftSelected = ref<RelationId[]>(normalizeRelationIds(props.selectedIds));
const confirmedSelected = ref<RelationId[]>(normalizeRelationIds(props.selectedIds));
const showAllConfirmed = ref(false);
const normalRecords = ref<any[]>([]);
const normalLoading = ref(false);
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
const targetTableName = computed(() => props.relationMeta?.targetTableName || "");
const targetRoute = computed(() => `/${targetTableName.value}`);
const { definition, getColumnFields } = useSchema(targetTableName);
const { isMounted } = useMounted();

let searchTimeout: ReturnType<typeof setTimeout> | null = null;

const idField = computed(() => getIdFieldName());
function normalizeRelationIds(items: unknown[]): RelationId[] {
  const seen = new Set<string>();
  return items.reduce<RelationId[]>((ids, item) => {
    const id = getRelationId(item, getId);
    if (id === null || seen.has(String(id))) return ids;
    seen.add(String(id));
    ids.push(id);
    return ids;
  }, []);
}

const draftSelectedIds = computed(() => normalizeRelationIds(draftSelected.value));
const confirmedIds = computed(() => normalizeRelationIds(confirmedSelected.value));
const selectedVisibleIds = computed(() => (
  showAllConfirmed.value
    ? draftSelectedIds.value
    : draftSelectedIds.value.slice(0, SELECTED_PREVIEW_LIMIT)
));
const selectedOverflowCount = computed(() => Math.max(0, draftSelectedIds.value.length - selectedVisibleIds.value.length));
const hasPendingSelectionChanges = computed(() => {
  const draft = new Set(draftSelectedIds.value.map(String));
  const confirmed = new Set(confirmedIds.value.map(String));
  if (draft.size !== confirmed.size) return true;
  return [...draft].some((id) => !confirmed.has(id));
});
const loading = computed(() => normalLoading.value);
const canLoadMore = computed(() => hasMoreNormal.value && !loading.value);

function getBaseFilter(): Record<string, any> | null {
  return hasActiveFilters(currentFilter.value) ? buildQuery(currentFilter.value) : null;
}

function getNormalFilter(pointer = normalPointer.value): Record<string, any> {
  const conditions: Record<string, any>[] = [];
  const baseFilter = getBaseFilter();
  if (baseFilter && Object.keys(baseFilter).length > 0) conditions.push(baseFilter);
  const searchFilter = buildRelationSearchFilter(searchDebounced.value, definition.value, idField.value);
  if (searchFilter) conditions.push(searchFilter);
  if (pointer !== null && pointer !== undefined) {
    conditions.push({ [idField.value]: { _lt: pointer } });
  }

  if (conditions.length === 0) return {};
  if (conditions.length === 1) return conditions[0] ?? {};
  return { _and: conditions };
}

async function fetchRecords(query: Record<string, any>) {
  return await useAuthFetch<any>(`/api${targetRoute.value}`, { query });
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
  const normalQuery = {
    fields,
    filter: getNormalFilter(reset ? null : normalPointer.value),
    sort: `-${idField.value}`,
    limit: LIST_LIMIT + 1,
  };

  normalLoading.value = true;
  try {
    const normalResponse = await fetchRecords(normalQuery);
    if (sequence !== requestSequence.value) return;

    const normalData = normalResponse?.data || [];
    normalRecords.value = normalData.slice(0, LIST_LIMIT);
    hasMoreNormal.value = normalData.length > LIST_LIMIT;
  } finally {
    if (sequence === requestSequence.value) {
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
  const id = getRelationId(item, getId);
  if (id === null || id === undefined) return;

  const isCurrentlySelected = draftSelectedIds.value.some((selectedId) => String(selectedId) === String(id));
  if (isCurrentlySelected) {
    removeSelection(id);
    return;
  }

  const nextSelection = props.multiple ? [...draftSelectedIds.value, id] : [id];
  draftSelected.value = nextSelection;
  if (!props.multiple) commitSelection(nextSelection, { close: true });
}

function removeSelection(id: RelationId) {
  draftSelected.value = draftSelectedIds.value.filter((selectedId) => String(selectedId) !== String(id));
}

function apply() {
  if (props.disabled) return;
  commitSelection(draftSelected.value);
}

function commitSelection(nextSelection: unknown[], options: { close?: boolean } = {}) {
  const next = normalizeRelationIds(nextSelection);
  confirmedSelected.value = next;
  emit("apply", next);
  if (options.close) isDrawerOpen.value = false;
  void refreshRecords({ reset: true });
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
  draftSelected.value = normalizeRelationIds(props.selectedIds);
  confirmedSelected.value = normalizeRelationIds(props.selectedIds);
  void refreshRecords({ reset: true });
});

watch(() => props.open, (open) => {
  if (!open) return;
  draftSelected.value = [...confirmedSelected.value];
  showAllConfirmed.value = false;
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
      <div class="space-y-3">
        <div class="flex min-h-8 items-center justify-between gap-3">
          <p class="min-w-0 truncate text-sm text-muted-foreground">
            {{ targetTableName || 'Unknown' }} records
          </p>
          <FormRelationActions
            :has-active-filters="hasActiveFilters(currentFilter)"
            :filter-count="activeFilterCount"
            :disabled="props.disabled"
            @open-filter="showFilterDrawer = true"
            @open-create="showCreateDrawer = true"
          />
        </div>

        <div class="flex min-h-11 flex-wrap items-center gap-2 rounded-lg border border-[var(--border-default)] bg-[var(--surface-muted)] px-3 py-1.5">
          <div class="flex h-7 items-center gap-2 text-sm font-semibold" :class="draftSelectedIds.length > 0 ? 'text-foreground' : 'text-muted-foreground'">
            <UIcon :name="draftSelectedIds.length > 0 ? 'lucide:check-circle-2' : 'lucide:circle'" class="h-4 w-4" :class="draftSelectedIds.length > 0 ? 'text-primary-500' : ''" />
            <span>{{ draftSelectedIds.length > 0 ? `${draftSelectedIds.length} selected` : 'No selection' }}</span>
          </div>
          <template v-if="draftSelectedIds.length > 0">
            <span class="h-5 w-px bg-[var(--border-default)]" aria-hidden="true" />
            <button
              v-for="id in selectedVisibleIds"
              :key="id"
              type="button"
              :title="`Remove ${id}`"
              class="group inline-flex h-7 max-w-52 items-center gap-1 rounded-md border border-[var(--state-primary-outline-border)] bg-[var(--state-primary-soft-bg)] px-2 font-mono text-sm text-[var(--state-primary-soft-text)] transition-colors hover:bg-[var(--state-primary-soft-bg-hover)]"
              @click="removeSelection(id)"
            >
              <span class="truncate">{{ id }}</span>
              <UIcon name="lucide:x" class="h-3.5 w-3.5 shrink-0 opacity-60 transition-opacity group-hover:opacity-100" />
            </button>
            <UButton
              v-if="selectedOverflowCount > 0"
              size="sm"
              variant="ghost"
              color="primary"
              @click="showAllConfirmed = true"
            >
              +{{ selectedOverflowCount }}
            </UButton>
            <span v-if="hasPendingSelectionChanges" class="ml-auto inline-flex h-7 items-center gap-1.5 text-xs font-medium text-[var(--state-primary-soft-text)]">
              <span class="h-1.5 w-1.5 rounded-full bg-current" />
              Unapplied changes
            </span>
          </template>
        </div>

        <div class="relative">
          <UInput v-model="searchQuery" :placeholder="`Search ${targetTableName || 'records'}...`" size="sm" class="w-full">
            <template #leading><UIcon name="lucide:search" class="text-muted-foreground" /></template>
            <template #trailing><UButton v-if="searchQuery" icon="lucide:x" size="xs" variant="ghost" color="neutral" @click="clearSearch" /></template>
          </UInput>

          <div v-if="hasSearchOrFilters" class="mt-2 flex items-center gap-2">
            <UBadge v-if="searchDebounced" variant="soft" color="info" size="xs">Search: "{{ searchDebounced }}"</UBadge>
            <FilterActiveSummary v-if="hasActiveFilters(currentFilter)" :count="activeFilterCount" variant="inline" :clearable="false" />
            <UButton size="xs" variant="ghost" color="error" @click="clearAllFilters">Clear all</UButton>
          </div>
        </div>

        <div class="overflow-hidden rounded-lg border border-[var(--border-default)] bg-[var(--surface-default)]">
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
            :selected="draftSelected"
            :multiple="props.multiple"
            :disabled="props.disabled"
            :get-detail-path="getDetailPath"
            @toggle="toggle"
          />
        </div>
      </div>
    </template>

    <template #footer>
      <div class="pt-1">
        <FormRelationPagination
          :can-go-previous="pointerHistory.length > 0"
          :can-go-next="canLoadMore"
          :loading="loading"
          :disabled="props.disabled || !hasPendingSelectionChanges"
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
    :selected="draftSelected"
    @created="() => refreshRecords({ reset: true })"
    @update:selected="draftSelected = normalizeRelationIds($event)"
  />

  <FilterDrawerLazy v-model="showFilterDrawer" :table-name="targetTableName" :current-filter="currentFilter" @apply="handleFilterApply" />

</template>
