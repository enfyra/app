<script setup lang="ts">
import { h } from 'vue'
import { UBadge, UButton } from '#components'
import type { ColumnDef } from '@tanstack/vue-table'
import type { DataTablePaginationConfig } from '~/types/table-pagination'
import type { TableDefinitionColumn } from '~/types/database'
import { resolveTableCellDisplay } from '~/utils/data-table-cell-formatter'
import { resolveRelationDetailPath } from '~/utils/relation-detail-paths'
import { getRelationId } from '~/utils/relation-records'
import type { RelationId, RelationRecord, RelationRecordsResponse, RelationSelectionMetadata } from '~/types/relation'

const props = defineProps<{
  relationMeta: RelationSelectionMetadata;
  selectedIds: RelationId[];
  multiple?: boolean;
  disabled?: boolean;
  open?: boolean;
}>();

const emit = defineEmits<{
  apply: [ids: RelationId[]];
  'update:open': [open: boolean];
}>();
const { getId, getIdFieldName } = useDatabase();

const LIST_LIMIT = 10;
const SELECTED_PREVIEW_LIMIT = 5;
const RELATION_REQUEST_TIMEOUT_MS = 15_000;

const isDrawerOpen = computed({
  get: () => props.open || false,
  set: (value) => emit("update:open", value),
});

const draftSelected = ref<RelationId[]>(normalizeRelationIds(props.selectedIds));
const confirmedSelected = ref<RelationId[]>(normalizeRelationIds(props.selectedIds));
const showAllSelected = ref(false);
const normalRecords = ref<RelationRecord[]>([]);
const normalLoading = ref(false);
const recordTotal = ref<number>();
const showFilterDrawer = ref(false);
const normalPointer = ref<RelationId | null>(null);
const pointerHistory = ref<(RelationId | null)[]>([]);
const hasMoreNormal = ref(true);
const requestSequence = ref(0);
const loadError = ref<string | null>(null);
const { createEmptyFilter, buildQuery, hasActiveFilters, countActiveFilters } = useFilterQuery();
const currentFilter = ref(createEmptyFilter());
const activeFilterCount = computed(() => countActiveFilters(currentFilter.value));
const targetTableName = computed(() => props.relationMeta?.targetTableName || "");
const targetRoute = computed(() => `/${targetTableName.value}`);
const { definition, getColumnFields } = useSchema(targetTableName);

let activeRequestController: AbortController | null = null;
let activeRequestTimer: ReturnType<typeof setTimeout> | null = null;

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
  showAllSelected.value
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
const hasActiveFilter = computed(() => hasActiveFilters(currentFilter.value));

const paginationConfig = computed<DataTablePaginationConfig>(() => ({
  mode: 'cursor',
  itemsPerPage: LIST_LIMIT,
  total: recordTotal.value,
  loading: loading.value,
  hasNextPage: hasMoreNormal.value,
  showPageSize: false,
  floating: false,
}));

const cursorPage = computed({
  get: () => pointerHistory.value.length + 1,
  set: (target: number) => {
    if (target > pointerHistory.value.length + 1) void loadMore();
    else if (target < pointerHistory.value.length + 1) void loadPrevious();
  },
});

function getBaseFilter(): Record<string, unknown> | null {
  return hasActiveFilters(currentFilter.value) ? buildQuery(currentFilter.value) : null;
}

function getNormalFilter(pointer = normalPointer.value): Record<string, unknown> {
  const baseFilter = getBaseFilter();
  if (pointer === null || pointer === undefined) return baseFilter ?? {};
  const pointerCondition = { [idField.value]: { _lt: pointer } };
  if (!baseFilter || Object.keys(baseFilter).length === 0) return pointerCondition;
  return { _and: [baseFilter, pointerCondition] };
}

async function fetchRecords(query: Record<string, unknown>, signal: AbortSignal) {
  return await useAuthFetch<RelationRecordsResponse>(`/api${targetRoute.value}`, { query, signal });
}

function cancelActiveRequest() {
  activeRequestController?.abort();
  activeRequestController = null;
  if (activeRequestTimer) {
    clearTimeout(activeRequestTimer);
    activeRequestTimer = null;
  }
}

async function refreshRecords({ reset = false } = {}) {
  if (!targetTableName.value) {
    requestSequence.value += 1;
    cancelActiveRequest();
    normalLoading.value = false;
    recordTotal.value = undefined;
    loadError.value = null;
    return;
  }
  if (reset) {
    normalPointer.value = null;
    pointerHistory.value = [];
    normalRecords.value = [];
    recordTotal.value = undefined;
    hasMoreNormal.value = true;
  }

  const sequence = ++requestSequence.value;
  cancelActiveRequest();
  const controller = new AbortController();
  let timedOut = false;
  activeRequestController = controller;
  const requestTimer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, RELATION_REQUEST_TIMEOUT_MS);
  activeRequestTimer = requestTimer;
  normalLoading.value = true;
  loadError.value = null;
  try {
    const fields = await getColumnFields();
    if (sequence !== requestSequence.value) return;

    const includeTotal = normalPointer.value === null || normalPointer.value === undefined;
    const normalQuery = {
      fields,
      ...(includeTotal ? { meta: 'filterCount' } : {}),
      filter: getNormalFilter(reset ? null : normalPointer.value),
      sort: `-${idField.value}`,
      limit: LIST_LIMIT + 1,
    };
    const normalResponse = await fetchRecords(normalQuery, controller.signal);
    if (sequence !== requestSequence.value) return;

    const normalData = normalResponse?.data || [];
    normalRecords.value = normalData.slice(0, LIST_LIMIT);
    hasMoreNormal.value = normalData.length > LIST_LIMIT;
    if (includeTotal) {
      const total = normalResponse?.meta?.filterCount;
      recordTotal.value = typeof total === 'number' && Number.isFinite(total) && total >= 0 ? total : undefined;
    }
  } catch {
    if (sequence !== requestSequence.value) return;
    normalRecords.value = [];
    hasMoreNormal.value = false;
    loadError.value = timedOut
      ? "Loading relations timed out. Try again."
      : "Unable to load relations. Try again.";
  } finally {
    if (activeRequestController === controller) {
      activeRequestController = null;
    }
    clearTimeout(requestTimer);
    if (activeRequestTimer === requestTimer) {
      activeRequestTimer = null;
    }
    if (sequence === requestSequence.value) {
      normalLoading.value = false;
    }
  }
}

async function loadMore() {
  if (!canLoadMore.value || normalRecords.value.length === 0) return;
  const nextPointer = getRelationId(normalRecords.value[normalRecords.value.length - 1], getId);
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

function removeSelection(id: RelationId) {
  if (props.disabled) return;
  draftSelected.value = draftSelectedIds.value.filter((selectedId) => String(selectedId) !== String(id));
}

function apply() {
  if (props.disabled) return;
  commitSelection(draftSelected.value);
}

function commitSelection(nextSelection: unknown[]) {
  const next = normalizeRelationIds(nextSelection);
  confirmedSelected.value = next;
  emit("apply", next);
  isDrawerOpen.value = false;
  void refreshRecords({ reset: true });
}

function getDetailPath(item: RelationRecord): string | null {
  if (!targetTableName.value) return null;
  const url = resolveRelationDetailPath(targetTableName.value, item);
  if (url) return url;
  const itemId = getId(item);
  return itemId ? `/data/${targetTableName.value}/${itemId}` : null;
}

const detailColumn = computed<ColumnDef<RelationRecord> | null>(() => {
  if (!targetTableName.value) return null;
  return {
    id: '__actions',
    header: '',
    enableSorting: false,
    enableHiding: false,
    size: 44,
    minSize: 44,
    maxSize: 44,
    cell: ({ row }) => {
      const path = getDetailPath(row.original);
      if (!path) return null;
      return h(UButton, {
        to: path,
        icon: 'lucide:external-link',
        size: 'xs',
        variant: 'ghost',
        color: 'neutral',
        title: 'Navigate to detail page',
        onClick: (event: Event) => event.stopPropagation(),
      });
    },
  };
});


const columns = computed<ColumnDef<RelationRecord>[]>(() => {
  const fields = definition.value
    .filter((field): field is TableDefinitionColumn & { name: string } => field.fieldType === 'column' && !!field.name && field.metadataAccess?.read !== false)
    .sort((a, b) => {
      const aName = a.name?.toLowerCase() || '';
      const bName = b.name?.toLowerCase() || '';
      if (aName === 'id' || aName === '_id') return -1;
      if (bName === 'id' || bName === '_id') return 1;
      const aKey = a.createdAt ? new Date(a.createdAt).getTime() : (a.id ?? Number.MAX_SAFE_INTEGER);
      const bKey = b.createdAt ? new Date(b.createdAt).getTime() : (b.id ?? Number.MAX_SAFE_INTEGER);
      return aKey - bKey;
    });

  const source = fields.length > 0
    ? fields
    : [{ name: idField.value, label: 'ID', metadata: null }];

  const dataColumns = source.map((field): ColumnDef<RelationRecord> => {
    const name = field.name;
    const isId = ['id', '_id'].includes(name.toLowerCase());
    return {
      id: name,
      accessorKey: name,
      header: field.label || name,
      enableSorting: false,
      ...(isId ? { size: 84, minSize: 84, maxSize: 220 } : {}),
      cell: ({ getValue }: { getValue: () => unknown }) => {
        const value = getValue();
        if ('type' in field && field.type === 'code' && typeof field.metadata?.tableCell?.formatter !== 'string') return value == null || value === '' ? '_' : 'Code';
        const display = resolveTableCellDisplay(field.metadata ?? {}, value);
        return display.color
          ? h(UBadge, { label: display.text, color: display.color, variant: display.variant ?? 'soft' })
          : display.text;
      },
    };
  });

  return [...dataColumns, ...(detailColumn.value ? [detailColumn.value] : [])];
});

async function handleFilterApply(filter: FilterGroup) {
  currentFilter.value = filter;
  await refreshRecords({ reset: true });
}

function clearFilter() {
  currentFilter.value = createEmptyFilter();
  void refreshRecords({ reset: true });
}

function showAllSelectedRecords() {
  showAllSelected.value = true;
}

watch(() => props.selectedIds, () => {
  draftSelected.value = normalizeRelationIds(props.selectedIds);
  confirmedSelected.value = normalizeRelationIds(props.selectedIds);
  void refreshRecords({ reset: true });
});

watch(() => props.open, (open) => {
  if (!open) return;
  draftSelected.value = [...confirmedSelected.value];
  showAllSelected.value = false;
  void refreshRecords({ reset: true });
});

onBeforeUnmount(() => {
  requestSequence.value += 1;
  cancelActiveRequest();
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
              @click="showAllSelectedRecords"
            >
              +{{ selectedOverflowCount }}
            </UButton>
            <span v-if="hasPendingSelectionChanges" class="ml-auto inline-flex h-7 items-center gap-1.5 text-xs font-medium text-[var(--state-primary-soft-text)]">
              <span class="h-1.5 w-1.5 rounded-full bg-current" />
              Unapplied changes
            </span>
          </template>
        </div>

        <DataTable
          :data="normalRecords"
          :columns="columns"
          :loading="loading"
          :header-name="targetTableName || 'Records'"
          enable-row-selection
          :row-selection-mode="props.multiple ? 'multiple' : 'single'"
          :selection-disabled="props.disabled"
          select-on-row-click
          :selected-row-ids="draftSelectedIds"
          v-model:page="cursorPage"
          :pagination-config="paginationConfig"
          :reload="() => refreshRecords({ reset: true })"
          :reload-loading="loading"
          @update:selected-row-ids="draftSelected = normalizeRelationIds($event)"
        >
          <template #toolbar>
            <div v-if="hasActiveFilter" class="flex min-w-0 items-center gap-2">
              <FilterActiveSummary :count="activeFilterCount" variant="inline" :clearable="false" />
              <UButton size="xs" variant="ghost" color="error" @click="clearFilter">Clear filter</UButton>
            </div>
          </template>

          <template #toolbar-actions>
            <FormRelationActions
              :has-active-filters="hasActiveFilter"
              :filter-count="activeFilterCount"
              @open-filter="showFilterDrawer = true"
            />
          </template>

          <template #empty>
            <CommonEmptyState
              v-if="loadError"
              variant="naked"
              title="Unable to load relations"
              :description="loadError"
              icon="lucide:circle-alert"
              size="sm"
              :action="{ label: 'Retry', onClick: () => refreshRecords({ reset: true }), icon: 'lucide:refresh-cw' }"
            />
            <CommonEmptyState
              v-else
              variant="naked"
              :title="hasActiveFilter ? 'No results found' : 'No relations available'"
              :description="hasActiveFilter ? 'Try adjusting your filter' : 'No relations have been created yet'"
              icon="lucide:database"
              size="sm"
              :action="hasActiveFilter ? { label: 'Clear filter', onClick: clearFilter, icon: 'lucide:x' } : undefined"
            />
          </template>
        </DataTable>
      </div>
    </template>

    <template #footer>
      <div class="flex items-center justify-between gap-3">
        <span class="min-w-0 truncate text-xs text-muted-foreground">
          {{ draftSelectedIds.length }} selected
        </span>
        <UButton
          icon="lucide:check"
          color="primary"
          size="sm"
          :disabled="props.disabled || !hasPendingSelectionChanges"
          @click="apply"
        >
          Apply
        </UButton>
      </div>
    </template>
  </CommonDrawer>

  <FilterDrawerLazy v-model="showFilterDrawer" :table-name="targetTableName" :current-filter="currentFilter" @apply="handleFilterApply" />
</template>
