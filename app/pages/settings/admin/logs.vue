<script setup lang="ts">
import type { RuntimeLogRow } from '~/types/runtime-log';

const { registerPageHeader } = usePageHeaderRegistry();
const { checkPermissionCondition } = usePermissions();
const { me } = useAuth();
const route = useRoute();
const kind = ref('system');
const correlationId = ref(String(route.query.correlationId ?? ''));
const component = ref('');
const code = ref('');
const hours = ref(24);
const filtersOpen = ref(false);
const timeWindows = [
  { label: 'Last hour', value: 1 },
  { label: 'Last 24 hours', value: 24 },
  { label: 'Last 7 days', value: 168 },
  { label: 'Last 30 days', value: 720 },
];
const page = ref(1);
const selected = ref<RuntimeLogRow | null>(null);
const detailOpen = ref(false);
const path = computed(() => kind.value === 'system' ? '/enfyra_system_error' : '/enfyra_user_log');
const canRead = (target: string) => !!me.value?.isRootAdmin || checkPermissionCondition({ or: [{ route: target, methods: ['GET'] }] });
const tabs = computed(() => [
  { label: 'System errors', value: 'system', icon: 'lucide:bug', disabled: !canRead('/enfyra_system_error') },
  { label: 'User logs', value: 'user', icon: 'lucide:terminal', disabled: !canRead('/enfyra_user_log') },
]);
const commonFields = ['eventId', 'occurredAt', 'correlationId', 'instanceId', 'component', 'sourceKind', 'sourceId', 'statusCode'];
const filter = ref<Record<string, unknown>>({});
const fields = computed(() => [...commonFields, ...(kind.value === 'system' ? ['code', 'message', 'severity'] : ['entryCount', 'truncated'])]);
const { data, pending, error, execute } = useApi<{ data: RuntimeLogRow[]; meta?: { filterCount?: number } }>(() => path.value, {
  query: () => ({ fields: fields.value, filter: filter.value, sort: '-occurredAt', limit: 25, page: page.value, meta: 'filterCount' }),
  disableErrorPage: true,
});
const { items: stableItems, showInitialLoading } = useStableListState(() => data.value?.data, () => pending.value);
const tabLoading = ref(false);
const items = computed(() => tabLoading.value ? [] : (data.value?.data ?? stableItems.value));
const listLoading = computed(() => showInitialLoading.value || tabLoading.value);
const total = computed(() => Number(data.value?.meta?.filterCount ?? 0));
const windowLabel = computed(() => timeWindows.find(item => item.value === hours.value)?.label ?? 'Selected window');
const visibleComponents = computed(() => new Set(items.value.map(row => row.component).filter(Boolean)).size);
const visibleVolume = computed(() => kind.value === 'system'
  ? items.value.filter(row => row.severity === 'error' || row.severity === 'fatal' || Number(row.statusCode) >= 500).length
  : items.value.reduce((sum, row) => sum + Number(row.entryCount ?? 0), 0));
const latestRow = computed(() => items.value[0]);
const summaryMetrics = computed(() => [
  { label: 'Matching', value: total.value.toLocaleString(), helper: windowLabel.value },
  { label: kind.value === 'system' ? 'Errors on page' : 'Entries on page', value: visibleVolume.value.toLocaleString(), helper: `${items.value.length} records visible` },
  { label: 'Components', value: visibleComponents.value.toLocaleString(), helper: 'on current page' },
  {
    label: 'Latest',
    value: latestRow.value ? new Date(latestRow.value.occurredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—',
    helper: latestRow.value ? new Date(latestRow.value.occurredAt).toLocaleDateString() : 'No activity',
  },
]);
const detailId = ref('');
const { data: detailData, pending: detailPending, error: detailError, execute: fetchDetail } = useApi<{ data: RuntimeLogRow[] }>(() => path.value, {
  query: () => ({ filter: { eventId: { _eq: detailId.value } }, limit: 1, fields: [...fields.value, ...(kind.value === 'system' ? ['stack', 'details', 'fingerprint'] : ['entries'])] }),
  disableErrorPage: true,
});
const detail = computed(() => detailData.value?.data?.[0] ?? selected.value);
const hasFilters = computed(() => !!(correlationId.value || component.value || (kind.value === 'system' && code.value)));
const detailFacts = computed(() => detail.value ? [
  ['Occurred', new Date(detail.value.occurredAt).toLocaleString()],
  ['Component', detail.value.component],
  ['Error code', detail.value.code],
  ['HTTP status', detail.value.statusCode],
  ['Source', detail.value.sourceKind],
  ['Source ID', detail.value.sourceId],
  ['Instance', detail.value.instanceId],
  ['Event ID', detail.value.eventId],
].filter(([, value]) => value != null && value !== '') : []);
function rowTitle(row: RuntimeLogRow): string {
  return row.message?.split(/\r?\n|\s+at\s+(?=\S+\s*\()/)[0]?.trim() || `${row.entryCount ?? 0} log entries`;
}
function resetFilters() {
  correlationId.value = ''; component.value = ''; code.value = '';
  search();
}
function formatValue(value: unknown): string {
  if (typeof value === 'string') { try { return JSON.stringify(JSON.parse(value), null, 2); } catch { return value; } }
  return JSON.stringify(value, null, 2) ?? '';
}
async function search() {
  page.value = 1;
  filter.value = {
    occurredAt: { _gte: new Date(Date.now() - hours.value * 3600_000).toISOString() },
    ...(correlationId.value.trim() ? { correlationId: { _eq: correlationId.value.trim() } } : {}),
    ...(component.value.trim() ? { component: { _eq: component.value.trim() } } : {}),
    ...(kind.value === 'system' && code.value.trim() ? { code: { _eq: code.value.trim() } } : {}),
  };
  if (canRead(path.value)) await execute();
}
async function inspect(row: RuntimeLogRow) {
  selected.value = row; detailId.value = row.eventId; detailData.value = null; detailOpen.value = true;
  await fetchDetail();
}
function traceRelated() {
  correlationId.value = detail.value?.correlationId ?? '';
  detailOpen.value = false;
  kind.value = kind.value === 'system' ? 'user' : 'system';
}
let tabLoadGeneration = 0;
watch(kind, async () => {
  const generation = ++tabLoadGeneration;
  tabLoading.value = true;
  data.value = null;
  selected.value = null;
  detailOpen.value = false;
  await nextTick();
  try {
    await Promise.all([
      search(),
      new Promise(resolve => setTimeout(resolve, 420)),
    ]);
  } finally {
    if (generation === tabLoadGeneration) tabLoading.value = false;
  }
});
onMounted(() => { if (!canRead(path.value) && canRead('/enfyra_user_log')) kind.value = 'user'; else void search(); });
registerPageHeader({ title: 'Server Logs', description: 'Trace system errors and user script logs by correlation ID', variant: 'default', gradient: 'purple' });
</script>

<template>
  <div class="w-full min-w-0 eapp-page-constrained space-y-6 overflow-hidden pb-10">
    <div v-if="canRead(path)" class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <div v-for="(metric, index) in summaryMetrics" :key="metric.label" class="surface-card rounded-lg p-4">
        <div class="text-xs font-medium text-[var(--text-tertiary)]">{{ metric.label }}</div>
        <div v-if="listLoading" class="mt-2 h-7 w-20 animate-pulse rounded eapp-surface-muted" />
        <div v-else class="mt-2 text-2xl font-semibold" :class="index === 1 && kind === 'system' && visibleVolume > 0 ? 'text-[var(--danger-color)]' : 'text-[var(--text-primary)]'">
          {{ metric.value }}
        </div>
        <div v-if="listLoading" class="mt-2 h-3 w-24 animate-pulse rounded eapp-surface-muted" />
        <div v-else class="mt-1 truncate text-xs text-[var(--text-tertiary)]">{{ metric.helper }}</div>
      </div>
    </div>

    <UTabs v-model="kind" :items="tabs" :content="false" variant="link" />

    <section v-if="canRead(path)" class="surface-card rounded-lg p-4">
      <div class="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <h2 class="font-medium text-[var(--text-primary)]">{{ kind === 'system' ? 'Recent system errors' : 'Recent user logs' }}</h2>
            <UBadge v-if="!listLoading && !error" color="neutral" variant="soft" size="xs">{{ total.toLocaleString() }}</UBadge>
          </div>
          <p class="mt-1 text-xs text-[var(--text-tertiary)]">Newest first · retained for 30 days</p>
        </div>

        <form class="flex min-w-0 flex-wrap items-center gap-2" role="search" @submit.prevent="search">
      <UInput v-model="correlationId" aria-label="Search by correlation ID" placeholder="Search by correlation ID…" icon="lucide:search" size="sm" :ui="{ base: 'h-9 py-1.5 ps-9 pe-3' }" class="min-w-0 basis-full sm:basis-auto sm:w-72" />
      <UPopover v-model:open="filtersOpen">
        <UButton color="neutral" variant="outline" icon="lucide:sliders-horizontal" class="h-9 px-3">
          Filters
          <UBadge v-if="component || (kind === 'system' && code)" color="primary" variant="soft" size="xs">{{ Number(!!component) + Number(kind === 'system' && !!code) }}</UBadge>
        </UButton>
        <template #content>
          <div class="w-72 max-w-[calc(100vw-2rem)] space-y-4 p-4">
            <p class="text-sm font-semibold">Filter logs</p>
            <UFormField label="Component" :ui="{ label: 'text-xs', container: 'mt-1' }">
              <UInput v-model="component" placeholder="e.g. Script" :ui="{ base: 'h-9 px-3 py-1.5' }" class="w-full" @keydown.enter.prevent="search(); filtersOpen = false" />
            </UFormField>
            <UFormField v-if="kind === 'system'" label="Error code" :ui="{ label: 'text-xs', container: 'mt-1' }">
              <UInput v-model="code" placeholder="e.g. HTTP_502" :ui="{ base: 'h-9 px-3 py-1.5' }" class="w-full" @keydown.enter.prevent="search(); filtersOpen = false" />
            </UFormField>
            <UButton class="h-9 w-full justify-center" :loading="pending" @click="search(); filtersOpen = false">Apply filters</UButton>
          </div>
        </template>
      </UPopover>
      <div class="flex min-w-0 items-center gap-2">
        <USelect v-model="hours" :items="timeWindows" aria-label="Time window" icon="lucide:clock-3" size="sm" :ui="{ base: 'h-9 py-1.5 ps-9 pe-9' }" class="w-40" @update:model-value="search" />
        <UButton type="submit" icon="lucide:refresh-cw" aria-label="Refresh logs" color="neutral" variant="outline" :loading="pending" class="size-9 justify-center p-0" />
      </div>
        </form>
      </div>

      <UAlert v-if="error" color="error" title="Could not load logs" :description="error.message" />
      <CommonResourceListFrame variant="plain" :loading="listLoading" :has-items="items.length > 0" :total="total" :items-per-page="25" :page="page" :pagination-loading="pending" item-size="sm" empty-title="No matching records" empty-description="Adjust the filters or refresh after reproducing the issue." @update:page="page = $event; execute()">
        <CommonResourceListItem
          v-for="row in items"
          :key="row.eventId"
          :title="rowTitle(row)"
          :icon="kind === 'system' ? 'lucide:bug' : 'lucide:terminal'"
          item-class="server-log-row"
          size="sm"
          @click="inspect(row)"
        >
          <template #title>
            <span class="flex w-full min-w-0 items-start gap-3">
              <span class="min-w-0 flex-1 truncate text-sm font-semibold eapp-text-primary" :title="rowTitle(row)">{{ rowTitle(row) }}</span>
              <UIcon name="lucide:chevron-right" class="server-log-row-chevron mt-0.5 size-4 shrink-0 eapp-text-tertiary" />
            </span>
          </template>
          <template #description>
            <span class="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs eapp-text-tertiary">
              <time :datetime="row.occurredAt">{{ new Date(row.occurredAt).toLocaleString() }}</time>
              <span aria-hidden="true">·</span>
              <span>{{ row.component }}</span>
              <UBadge v-if="row.code || row.sourceKind" color="neutral" variant="soft" size="xs" class="max-w-full"><span class="truncate">{{ row.code ?? row.sourceKind }}</span></UBadge>
              <UBadge v-if="row.statusCode" :color="row.statusCode >= 400 ? 'error' : 'neutral'" variant="soft" size="xs">{{ row.statusCode }}</UBadge>
              <UBadge v-if="row.truncated" color="warning" variant="soft" size="xs">Truncated</UBadge>
            </span>
          </template>
          <template #metadata>
            <span v-if="row.correlationId" class="mt-2 flex min-w-0 items-center gap-1.5 font-mono text-xs eapp-text-tertiary"><UIcon name="lucide:link" class="size-3 shrink-0" /><span class="truncate">{{ row.correlationId }}</span></span>
          </template>
        </CommonResourceListItem>
      </CommonResourceListFrame>
    </section>

    <CommonEmptyState v-if="!canRead(path)" title="Access denied" description="A route read permission is required to view these logs." icon="lucide:lock" />
    <CommonDrawer v-model="detailOpen" :cancel-action="{ label: 'Close' }">
      <template #header>
        <div class="flex items-center gap-2 text-base font-semibold">
          <UIcon :name="kind === 'system' ? 'lucide:bug' : 'lucide:terminal'" class="size-5" />
          {{ kind === 'system' ? 'Error details' : 'Log details' }}
        </div>
      </template>
      <template #body>
        <div class="min-w-0 space-y-6">
          <UAlert v-if="detailError" color="error" title="Could not load details" :description="detailError.message" />
          <div v-if="detailPending" role="status" class="flex items-center gap-2 text-sm eapp-text-tertiary"><UIcon name="lucide:loader-circle" class="size-4 animate-spin" />Loading full details…</div>
          <template v-if="detail">
            <section class="space-y-3">
              <UBadge :color="kind === 'system' ? 'error' : 'neutral'" variant="soft">{{ detail.severity ?? (kind === 'system' ? 'Error' : 'Script log') }}</UBadge>
              <h3 class="break-words text-base font-semibold leading-relaxed eapp-text-primary">{{ rowTitle(detail) }}</h3>
              <p v-if="detail.message && detail.message !== rowTitle(detail) && !detail.stack" class="whitespace-pre-wrap break-words text-sm eapp-text-secondary">{{ detail.message }}</p>
            </section>
            <section v-if="detail.correlationId" class="eapp-surface-muted space-y-3 rounded-[var(--radius-panel)] p-4">
              <h4 class="text-xs font-semibold eapp-text-tertiary">Correlation ID</h4>
              <p class="break-all font-mono text-xs eapp-text-primary">{{ detail.correlationId }}</p>
              <UButton v-if="canRead(kind === 'system' ? '/enfyra_user_log' : '/enfyra_system_error')" color="neutral" variant="outline" size="sm" icon="lucide:arrow-right-left" @click="traceRelated">{{ kind === 'system' ? 'Find related user logs' : 'Find related errors' }}</UButton>
            </section>
            <dl class="divide-y divide-[var(--border-subtle)] text-sm">
              <div v-for="[label, value] in detailFacts" :key="String(label)" class="grid grid-cols-[7rem_minmax(0,1fr)] gap-4 py-2.5">
                <dt class="eapp-text-tertiary">{{ label }}</dt><dd class="min-w-0 break-all eapp-text-primary">{{ value }}</dd>
              </div>
            </dl>
            <p v-if="detail.truncated" class="text-sm text-[var(--text-tertiary)]">Log output was truncated to stay within the storage limit.</p>
            <section v-if="detail.stack" class="space-y-2">
              <h4 class="text-sm font-semibold">Stack trace</h4>
              <pre class="max-h-80 overflow-auto whitespace-pre-wrap break-all rounded-[var(--radius-panel)] eapp-surface-muted p-4 font-mono text-xs leading-relaxed">{{ detail.stack }}</pre>
            </section>
            <section v-if="detail.entries != null" class="space-y-2">
              <h4 class="text-sm font-semibold">Log output</h4>
              <pre class="max-h-96 overflow-auto whitespace-pre-wrap break-all rounded-[var(--radius-panel)] eapp-surface-muted p-4 font-mono text-xs leading-relaxed">{{ formatValue(detail.entries) }}</pre>
            </section>
            <details v-if="detail.details != null" class="rounded-[var(--radius-panel)] border border-[var(--border-subtle)] p-4">
              <summary class="cursor-pointer text-sm font-medium">Additional details</summary>
              <pre class="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-all font-mono text-xs leading-relaxed">{{ formatValue(detail.details) }}</pre>
            </details>
            <p class="text-xs text-[var(--text-tertiary)]">Private details and entries require root administrator access or the corresponding field read permission.</p>
          </template>
        </div>
      </template>
    </CommonDrawer>
  </div>
</template>

<style scoped>
:deep(.server-log-row) {
  transition:
    background-color var(--duration-fast) var(--ease-standard),
    box-shadow var(--duration-fast) var(--ease-standard);
}

:deep(.server-log-row:hover) {
  background: color-mix(in srgb, var(--md-primary) 2.5%, var(--surface-default));
  box-shadow: inset 2px 0 0 color-mix(in srgb, var(--md-primary) 42%, transparent);
}

:deep(.server-log-row-chevron) {
  transition:
    color var(--duration-fast) var(--ease-standard),
    transform var(--duration-fast) var(--ease-standard);
}

:deep(.server-log-row:hover .server-log-row-chevron) {
  color: var(--md-primary);
  transform: translateX(2px);
}
</style>
