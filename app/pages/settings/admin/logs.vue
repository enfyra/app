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
const { items, showInitialLoading } = useStableListState(() => data.value?.data, () => pending.value);
const total = computed(() => Number(data.value?.meta?.filterCount ?? 0));
const detailId = ref('');
const { data: detailData, pending: detailPending, error: detailError, execute: fetchDetail } = useApi<{ data: RuntimeLogRow[] }>(() => path.value, {
  query: () => ({ filter: { eventId: { _eq: detailId.value } }, limit: 1, fields: [...fields.value, ...(kind.value === 'system' ? ['stack', 'details', 'fingerprint'] : ['entries'])] }),
  disableErrorPage: true,
});
const detail = computed(() => detailData.value?.data?.[0] ?? selected.value);
function formatValue(value: unknown): string {
  if (typeof value === 'string') { try { return JSON.stringify(JSON.parse(value), null, 2); } catch { return value; } }
  return JSON.stringify(value, null, 2) ?? '';
}
function search() {
  page.value = 1;
  filter.value = {
    occurredAt: { _gte: new Date(Date.now() - hours.value * 3600_000).toISOString() },
    ...(correlationId.value.trim() ? { correlationId: { _eq: correlationId.value.trim() } } : {}),
    ...(component.value.trim() ? { component: { _eq: component.value.trim() } } : {}),
    ...(kind.value === 'system' && code.value.trim() ? { code: { _eq: code.value.trim() } } : {}),
  };
  if (canRead(path.value)) void execute();
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
watch(kind, () => { data.value = null; selected.value = null; detailOpen.value = false; search(); });
onMounted(() => { if (!canRead(path.value) && canRead('/enfyra_user_log')) kind.value = 'user'; else search(); });
registerPageHeader({ title: 'Server Logs', description: 'Trace system errors and user script logs by correlation ID', variant: 'default' });
</script>

<template>
  <div class="eapp-page-constrained-wide space-y-5">
    <UTabs v-model="kind" :items="tabs" :content="false" />
    <template v-if="canRead(path)">
      <form class="surface-card rounded-lg p-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5" @submit.prevent="search">
        <UFormField label="Correlation ID"><UInput v-model="correlationId" placeholder="req_…" class="w-full" /></UFormField>
        <UFormField label="Component"><UInput v-model="component" placeholder="Script, Server…" class="w-full" /></UFormField>
        <UFormField v-if="kind === 'system'" label="Error code"><UInput v-model="code" placeholder="SYSTEM_ERROR" class="w-full" /></UFormField>
        <UFormField label="Time window"><USelect v-model="hours" :items="[{ label: 'Last hour', value: 1 }, { label: 'Last 24 hours', value: 24 }, { label: 'Last 7 days', value: 168 }, { label: 'Last 30 days', value: 720 }]" class="w-full" /></UFormField>
        <div class="flex items-end"><UButton type="submit" icon="lucide:search" :loading="pending">Search / Refresh</UButton></div>
      </form>
      <p class="text-sm text-[var(--text-tertiary)]">Open an entry for details. Use its correlation ID to find related errors and @LOGS output. Records are retained for 30 days.</p>
      <UAlert v-if="error" color="error" title="Could not load logs" :description="error.message" />
      <CommonResourceListFrame :loading="showInitialLoading" :has-items="items.length > 0" :total="total" :items-per-page="25" :page="page" :pagination-loading="pending" empty-title="No matching records" empty-description="Adjust the filters or refresh after reproducing the issue." @update:page="page = $event; execute()">
        <div class="divide-y divide-[var(--border-subtle)]">
          <button v-for="row in items" :key="row.eventId" type="button" class="w-full text-left px-4 py-3 hover:bg-[var(--surface-nested)] flex gap-3 min-w-0" @click="inspect(row)">
            <UIcon :name="kind === 'system' ? 'lucide:bug' : 'lucide:terminal'" class="mt-1 shrink-0" />
            <div class="min-w-0 flex-1 space-y-1">
              <div class="font-medium truncate">{{ row.message ?? `${row.entryCount} log entries` }}</div>
              <div class="text-xs text-[var(--text-tertiary)] flex flex-wrap gap-x-3 gap-y-1"><time>{{ new Date(row.occurredAt).toLocaleString() }}</time><span>{{ row.component }}</span><span>{{ row.code ?? row.sourceKind }}</span><span>{{ row.statusCode }}</span></div>
              <div class="font-mono text-xs truncate">{{ row.correlationId ?? row.eventId }}</div>
            </div>
            <UIcon name="lucide:chevron-right" class="shrink-0" />
          </button>
        </div>
      </CommonResourceListFrame>
    </template>
    <CommonEmptyState v-else title="Access denied" description="A route read permission is required to view these logs." icon="lucide:lock" />
    <CommonModal v-model:open="detailOpen" :ui="{ content: 'sm:max-w-3xl' }" :cancel-action="{ label: 'Close' }">
      <template #header><div class="font-semibold">{{ kind === 'system' ? 'System error' : 'User log' }}</div></template>
      <template #body>
        <div class="space-y-4 min-w-0">
          <UAlert v-if="detailError" color="error" title="Could not load details" :description="detailError.message" />
          <p v-if="detailPending">Loading details…</p>
          <template v-if="detail">
            <p class="break-all font-mono text-sm">{{ detail.correlationId ?? detail.eventId }}</p>
            <UButton v-if="detail.correlationId && canRead(kind === 'system' ? '/enfyra_user_log' : '/enfyra_system_error')" variant="soft" icon="lucide:link" @click="traceRelated">{{ kind === 'system' ? 'Find related user logs' : 'Find related errors' }}</UButton>
            <p v-if="detail.truncated" class="text-sm text-[var(--text-tertiary)]">Log output was truncated to stay within the storage limit.</p>
            <pre class="text-xs whitespace-pre-wrap break-all max-h-[55vh] overflow-auto eapp-surface-muted rounded-lg p-4">{{ formatValue(detail) }}</pre>
            <p class="text-xs text-[var(--text-tertiary)]">Private details and entries require root administrator access or the corresponding field read permission.</p>
          </template>
        </div>
      </template>
    </CommonModal>
  </div>
</template>
