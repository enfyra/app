<script setup lang="ts">
import type { RedisAdminKeySummary, RedisAdminSystemKind, RedisAdminValueType } from '~/types/runtime-monitor';
import { badgeColor, metricTextClass, shortText } from '~/utils/runtime-monitor/core';
import { fmtBytes, fmtDateTime, fmtNumber, fmtSec } from '~/utils/runtime-monitor/format';

type RuntimeMetricsViewModel = ReturnType<typeof useRuntimeMetrics>;

const props = defineProps<{ runtime: RuntimeMetricsViewModel }>();

const notify = useNotify();
const { confirm } = useConfirm();

const writableTypes: RedisAdminValueType[] = ['string', 'hash', 'list', 'set', 'zset'];
const formKey = ref('');
const formType = ref<RedisAdminValueType>('string');
const formValue = ref('"value"');
const formTtl = ref('');
const ttlInput = ref('');
const copiedKey = ref<string | null>(null);
let copiedKeyTimer: ReturnType<typeof setTimeout> | null = null;

const overview = computed(() => props.runtime.redisOverview);
const selected = computed(() => props.runtime.redisSelectedDetail);
const memoryRatio = computed(() => {
  const used = overview.value?.server.usedMemoryBytes ?? 0;
  const max = overview.value?.server.maxMemoryBytes ?? 0;
  return max > 0 ? used / max : 0;
});
const maxMemoryLabel = computed(() => {
  const max = overview.value?.server.maxMemoryBytes;
  if (max === 0) return 'unlimited';
  return overview.value?.server.maxMemoryHuman || fmtBytes(max);
});
const redisSeverity = computed(() =>
  memoryRatio.value >= 0.95
    ? 'error'
    : memoryRatio.value >= 0.8 || (overview.value?.server.memFragmentationRatio ?? 0) >= 2
      ? 'warning'
      : 'ok',
);
const canModifySelected = computed(() => selected.value?.modifiable !== false);
const canLoadMore = computed(() => props.runtime.redisKeysCursor !== '0');
const selectedLocked = computed(() => selected.value ? !canModifySelected.value : false);
const currentGroups = computed(() => overview.value?.groups ?? []);
const userCacheQuotaLabel = computed(() => {
  const quota = overview.value?.userCache;
  if (!quota || quota.limitBytes <= 0) return 'allocated memory not limited';
  return `${fmtBytes(quota.usedBytes)} / ${fmtBytes(quota.limitBytes)}`;
});
const userCacheQuotaDescription = computed(() => {
  const quota = overview.value?.userCache;
  if (!quota || quota.limitBytes <= 0) {
    return '$cache user data is not limited by Enfyra.';
  }
  const remaining = quota.remainingBytes == null ? null : fmtBytes(quota.remainingBytes);
  return remaining
    ? `${remaining} remaining for $cache user data. System Redis keys are not counted.`
    : 'Applies only to $cache user data. System Redis keys are not counted.';
});

watch(selected, (detail) => {
  if (!detail) return;
  formKey.value = detail.key;
  formType.value = writableTypes.includes(detail.type) ? detail.type : 'string';
  formValue.value = formatValueForEditor(detail.type, detail.value);
  formTtl.value = detail.ttlSeconds > 0 ? String(detail.ttlSeconds) : '';
  ttlInput.value = detail.ttlSeconds > 0 ? String(detail.ttlSeconds) : '';
}, { immediate: true });

function systemKindLabel(kind?: RedisAdminSystemKind) {
  switch (kind) {
    case 'runtime_cache':
      return 'runtime cache';
    case 'user_cache':
      return 'user cache';
    case 'bullmq':
      return 'BullMQ';
    case 'socket_io':
      return 'Socket.IO';
    case 'runtime_monitor':
      return 'runtime monitor';
    case 'sql_pool_coordination':
      return 'SQL pool';
    case 'system_lock':
      return 'system lock';
    default:
      return null;
  }
}

function systemKindColor(kind?: RedisAdminSystemKind) {
  switch (kind) {
    case 'runtime_cache':
      return 'primary';
    case 'user_cache':
      return 'success';
    case 'bullmq':
      return 'warning';
    case 'socket_io':
      return 'info';
    case 'runtime_monitor':
      return 'neutral';
    case 'sql_pool_coordination':
      return 'warning';
    case 'system_lock':
      return 'error';
    default:
      return 'neutral';
  }
}

function groupLabel(group: { systemKind?: RedisAdminSystemKind; system?: boolean; name: string }) {
  return group.systemKind ? systemKindLabel(group.systemKind) : group.system ? 'system' : 'custom keys';
}

function groupColor(group: { systemKind?: RedisAdminSystemKind; system?: boolean }) {
  return group.systemKind ? systemKindColor(group.systemKind) : group.system ? 'neutral' : 'success';
}

function groupDescription(group: { systemKind?: RedisAdminSystemKind; system?: boolean; name: string }) {
  switch (group.systemKind) {
    case 'runtime_cache':
      return 'Shared runtime definition snapshots';
    case 'user_cache':
      return '$cache data created by handlers and flows';
    case 'bullmq':
      return 'Queue state and retained jobs';
    case 'socket_io':
      return 'Socket.IO adapter coordination';
    case 'runtime_monitor':
      return 'Runtime metrics and telemetry';
    case 'system_lock':
      return 'Boot, provision, or recovery locks';
    default:
      return group.system ? group.name : 'Keys created outside system-managed namespaces';
  }
}

function ownerLabel(row?: { isSystem?: boolean; modifiable?: boolean; systemKind?: RedisAdminSystemKind }) {
  if (!row) return '';
  if (row.isSystem) return 'system';
  return row.modifiable === false ? 'read only' : 'editable';
}

function ownerColor(row?: { isSystem?: boolean; modifiable?: boolean; systemKind?: RedisAdminSystemKind }) {
  if (!row) return 'neutral';
  if (row.isSystem) return 'neutral';
  return row.modifiable === false ? 'warning' : 'success';
}

function parseJsonLike(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function formatValueForEditor(type: RedisAdminValueType, value: unknown) {
  if (type === 'string' && typeof value === 'string') {
    const parsed = parseJsonLike(value);
    return typeof parsed === 'string' ? parsed : JSON.stringify(parsed, null, 2);
  }
  return JSON.stringify(value, null, 2);
}

function ttlLabel(value: number) {
  if (value === -1) return 'persistent';
  if (value === -2) return 'missing';
  return fmtSec(value * 1000);
}

function parseValue() {
  try {
    const parsed = JSON.parse(formValue.value);
    return formType.value === 'string' && typeof parsed !== 'string'
      ? JSON.stringify(parsed)
      : parsed;
  } catch (error) {
    if (formType.value === 'string') return formValue.value;
    throw new Error('Value must be valid JSON for this Redis type');
  }
}

function positiveTtlOrNull(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const ttl = Number(trimmed);
  if (!Number.isInteger(ttl) || ttl <= 0) {
    throw new Error('TTL must be a positive integer');
  }
  return ttl;
}

async function refreshRedis() {
  await Promise.all([
    props.runtime.refreshRedisOverview(),
    props.runtime.scanRedisKeys({ reset: true }),
  ]);
}

async function loadKey(row: RedisAdminKeySummary) {
  await props.runtime.selectRedisKey(row.key);
}

async function saveKey() {
  try {
    if (selected.value && !canModifySelected.value) return;
    const key = formKey.value.trim();
    if (!key) throw new Error('Key is required');
    await props.runtime.saveRedisKey({
      key,
      type: formType.value,
      value: parseValue(),
      ttlSeconds: positiveTtlOrNull(formTtl.value),
    });
    notify.success('Redis key saved', key);
  } catch (error) {
    notify.error('Redis save failed', error instanceof Error ? error.message : String(error));
  }
}

async function applyTtl() {
  try {
    if (!selected.value || !canModifySelected.value) return;
    const key = selected.value.key;
    await props.runtime.updateRedisKeyTtl(
      key,
      positiveTtlOrNull(ttlInput.value),
    );
    notify.success('TTL updated', key);
  } catch (error) {
    notify.error('TTL update failed', error instanceof Error ? error.message : String(error));
  }
}

async function deleteKey() {
  if (!selected.value || !canModifySelected.value) return;
  const key = selected.value.key;
  const ok = await confirm({
    title: 'Delete Redis key',
    content: key,
    confirmText: 'Delete',
    cancelText: 'Cancel',
  });
  if (!ok) return;
  const result = await props.runtime.deleteRedisKey(key);
  if (result?.deleted) {
    notify.success('Redis key deleted', key);
  } else {
    notify.warning('Redis key not found', key);
  }
}

async function persistSelectedKey() {
  if (!selected.value || !canModifySelected.value) return;
  const key = selected.value.key;
  await props.runtime.updateRedisKeyTtl(key, null);
}

async function copyKey(key: string) {
  try {
    await navigator.clipboard.writeText(key);
    copiedKey.value = key;
    if (copiedKeyTimer) clearTimeout(copiedKeyTimer);
    copiedKeyTimer = setTimeout(() => {
      copiedKey.value = null;
      copiedKeyTimer = null;
    }, 1200);
  } catch (error) {
    notify.error('Copy failed', error instanceof Error ? error.message : String(error));
  }
}

onBeforeUnmount(() => {
  if (copiedKeyTimer) clearTimeout(copiedKeyTimer);
});

function newKey() {
  props.runtime.clearRedisSelection();
  formKey.value = '';
  formType.value = 'string';
  formValue.value = '"value"';
  formTtl.value = '';
  ttlInput.value = '';
}
</script>

<template>
  <div class="grid min-w-0 gap-4 overflow-hidden">
    <section class="surface-card min-w-0 rounded-lg p-4">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-default)] pb-3">
        <div>
          <div class="font-medium text-[var(--text-primary)]">Redis Server</div>
          <div class="mt-1 text-xs text-[var(--text-tertiary)]">
            Redis INFO · keyspace · keys
          </div>
        </div>
        <div class="flex items-center gap-2">
          <UBadge :color="badgeColor(redisSeverity)" variant="soft">
            {{ redisSeverity === 'error' ? 'Critical' : redisSeverity === 'warning' ? 'Attention' : 'Healthy' }}
          </UBadge>
          <UButton
            icon="lucide:refresh-cw"
            size="sm"
            variant="soft"
            color="neutral"
            :loading="runtime.redisKeysPending"
            @click="refreshRedis"
          />
        </div>
      </div>

      <div v-if="runtime.redisError" class="mt-3 rounded-lg border border-warning-400/20 bg-warning-400/5 p-3 text-sm text-warning-700 dark:text-warning-300">
        {{ runtime.redisError }}
      </div>

      <div class="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div class="rounded-lg border border-[var(--border-default)] p-3">
          <div class="text-xs font-medium text-[var(--text-tertiary)]">Keys</div>
          <div class="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{{ fmtNumber(overview?.keyCount ?? 0) }}</div>
          <div class="mt-1 text-xs text-[var(--text-tertiary)]">
            scanned {{ fmtNumber(overview?.scanned ?? 0) }}{{ overview?.scanComplete === false ? '+' : '' }}
          </div>
        </div>
        <div class="rounded-lg border border-[var(--border-default)] p-3">
          <div class="text-xs font-medium text-[var(--text-tertiary)]">Memory</div>
          <div class="mt-2 text-2xl font-semibold" :class="metricTextClass(redisSeverity)">
            {{ overview?.server.usedMemoryHuman || fmtBytes(overview?.server.usedMemoryBytes) }}
          </div>
          <div class="mt-1 text-xs text-[var(--text-tertiary)]">
            max {{ maxMemoryLabel }}
          </div>
        </div>
        <div class="rounded-lg border border-[var(--border-default)] p-3">
          <div class="text-xs font-medium text-[var(--text-tertiary)]">Hardware</div>
          <div class="mt-2 truncate text-sm font-semibold text-[var(--text-primary)]">
            {{ overview?.server.os || '-' }}
          </div>
          <div class="mt-1 text-xs text-[var(--text-tertiary)]">
            {{ overview?.server.archBits ?? '-' }} bit · system {{ overview?.server.totalSystemMemoryHuman || fmtBytes(overview?.server.totalSystemMemoryBytes) }}
          </div>
        </div>
        <div class="rounded-lg border border-[var(--border-default)] p-3">
          <div class="text-xs font-medium text-[var(--text-tertiary)]">Process</div>
          <div class="mt-2 text-sm font-semibold text-[var(--text-primary)]">
            Redis {{ overview?.server.redisVersion || '-' }}
          </div>
          <div class="mt-1 text-xs text-[var(--text-tertiary)]">
            pid {{ overview?.server.processId ?? '-' }} · port {{ overview?.server.tcpPort ?? '-' }}
          </div>
        </div>
        <div class="rounded-lg border border-[var(--border-default)] p-3 sm:col-span-2 xl:col-span-4">
          <div class="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
            <div class="min-w-0">
              <div class="text-xs font-medium text-[var(--text-tertiary)]">Allocated Redis Memory</div>
              <div class="mt-2 text-sm font-semibold text-[var(--text-primary)]">{{ userCacheQuotaLabel }}</div>
              <div class="mt-1 text-xs text-[var(--text-tertiary)]">{{ userCacheQuotaDescription }}</div>
            </div>
            <div class="flex flex-wrap gap-2 md:justify-end">
              <UBadge color="success" variant="soft">$cache</UBadge>
              <UBadge color="neutral" variant="soft">
                {{ overview?.userCache.evictionPolicy === 'lru' ? 'LRU eviction' : 'unlimited' }}
              </UBadge>
              <UBadge v-if="overview?.userCache.maxValueBytes" color="neutral" variant="soft">
                max value {{ fmtBytes(overview.userCache.maxValueBytes) }}
              </UBadge>
            </div>
          </div>
        </div>
      </div>

      <div class="mt-4 grid gap-3 xl:grid-cols-2">
        <div class="rounded-lg border border-[var(--border-default)] p-3">
          <div class="text-xs font-medium text-[var(--text-tertiary)]">Server Details</div>
          <div class="mt-2 grid grid-cols-2 gap-2 text-sm">
            <div>Mode / role</div>
            <div class="text-right font-medium">{{ overview?.server.mode ?? '-' }} / {{ overview?.server.role ?? '-' }}</div>
            <div>Uptime</div>
            <div class="text-right font-medium">{{ fmtSec((overview?.server.uptimeSeconds ?? 0) * 1000) }}</div>
            <div>Clients</div>
            <div class="text-right font-medium">{{ overview?.server.connectedClients ?? '-' }}</div>
            <div>Allocator</div>
            <div class="truncate text-right font-medium">{{ overview?.server.allocator ?? '-' }}</div>
            <div>Fragmentation</div>
            <div class="text-right font-medium" :class="metricTextClass((overview?.server.memFragmentationRatio ?? 0) >= 2 ? 'warning' : 'ok')">
              {{ overview?.server.memFragmentationRatio ?? '-' }}
            </div>
            <div>CPU sys/user</div>
            <div class="text-right font-medium">{{ overview?.server.usedCpuSys ?? '-' }} / {{ overview?.server.usedCpuUser ?? '-' }}</div>
            <div>Last read</div>
            <div class="truncate text-right font-medium">{{ fmtDateTime(runtime.redisOverviewUpdatedAt ? new Date(runtime.redisOverviewUpdatedAt) : null) }}</div>
          </div>
        </div>

        <div class="rounded-lg border border-[var(--border-default)] p-3">
          <div class="flex items-center justify-between gap-3">
            <div class="text-xs font-medium text-[var(--text-tertiary)]">Key Categories</div>
            <div class="grid grid-cols-[56px_84px] gap-2 text-right text-[10px] font-medium uppercase text-[var(--text-quaternary)] sm:grid-cols-[64px_96px] sm:gap-3">
              <div>Keys</div>
              <div>Memory</div>
            </div>
          </div>
          <div class="mt-3 space-y-2 text-sm">
            <div v-for="group in currentGroups" :key="group.name" class="grid grid-cols-[minmax(0,1fr)_56px_84px] items-center gap-2 sm:grid-cols-[minmax(0,1fr)_64px_96px] sm:gap-3">
              <div class="min-w-0">
                <UBadge :color="groupColor(group)" variant="soft" size="xs">
                  {{ groupLabel(group) }}
                </UBadge>
                <div class="mt-1 truncate text-xs text-[var(--text-tertiary)]">
                  {{ groupDescription(group) }}
                </div>
              </div>
              <div class="text-right text-[var(--text-tertiary)]">{{ fmtNumber(group.count) }}</div>
              <div class="text-right text-[var(--text-tertiary)]">{{ fmtBytes(group.memoryBytes) }}</div>
            </div>
            <div v-if="currentGroups.length === 0" class="text-[var(--text-tertiary)]">No current namespace keys found</div>
          </div>

        </div>
      </div>
    </section>

    <section class="grid min-w-0 items-stretch gap-4 xl:grid-cols-2">
      <div class="surface-card min-w-0 rounded-lg p-4">
        <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div class="font-medium text-[var(--text-primary)]">Key Browser</div>
          <div class="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto_auto] gap-2 sm:w-auto sm:grid-cols-[16rem_auto_auto]">
            <UInput v-model="runtime.redisKeysPattern" icon="i-lucide-search" size="sm" class="min-w-0" placeholder="pattern, e.g. *" @keyup.enter="runtime.scanRedisKeys({ reset: true })" />
            <UButton size="sm" icon="lucide:scan-search" :loading="runtime.redisKeysPending" class="min-w-0" @click="runtime.scanRedisKeys({ reset: true })">
              Scan
            </UButton>
            <UButton size="sm" icon="lucide:plus" color="neutral" variant="soft" @click="newKey" />
          </div>
        </div>

        <div class="space-y-2 md:hidden">
          <div
            v-for="row in runtime.redisKeys"
            :key="row.key"
            role="button"
            tabindex="0"
            class="w-full rounded-lg border border-[var(--border-default)] p-3 text-left hover:bg-[var(--surface-muted)]"
            :class="runtime.redisSelectedKey === row.key ? 'bg-primary-500/5' : ''"
            @click="loadKey(row)"
            @keydown.enter.prevent="loadKey(row)"
            @keydown.space.prevent="loadKey(row)"
          >
            <div class="flex min-w-0 items-start justify-between gap-2">
              <div class="min-w-0">
                <div class="truncate font-mono text-xs text-[var(--text-primary)]" :title="row.key">{{ row.key }}</div>
                <div class="mt-1 flex flex-wrap gap-1">
                  <UBadge color="neutral" variant="soft" size="xs">{{ row.type }}</UBadge>
                  <UBadge v-if="row.systemKind" :color="systemKindColor(row.systemKind)" variant="soft" size="xs">
                    {{ systemKindLabel(row.systemKind) }}
                  </UBadge>
                  <UBadge :color="ownerColor(row)" variant="soft" size="xs">
                    {{ ownerLabel(row) }}
                  </UBadge>
                </div>
              </div>
              <button
                type="button"
                class="shrink-0 text-[var(--text-quaternary)] hover:text-[var(--text-primary)]"
                :class="copiedKey === row.key ? 'text-success-500 hover:text-success-500' : ''"
                title="Copy key"
                @click.stop="copyKey(row.key)"
              >
                <UIcon :name="copiedKey === row.key ? 'lucide:check' : 'lucide:copy'" class="h-4 w-4" />
              </button>
            </div>
            <div class="mt-3 grid grid-cols-3 gap-2 text-xs text-[var(--text-tertiary)]">
              <div>
                <div class="text-[10px] uppercase text-[var(--text-quaternary)]">TTL</div>
                <div class="mt-0.5 truncate">{{ ttlLabel(row.ttlSeconds) }}</div>
              </div>
              <div class="text-right">
                <div class="text-[10px] uppercase text-[var(--text-quaternary)]">Size</div>
                <div class="mt-0.5">{{ row.size ?? '-' }}</div>
              </div>
              <div class="text-right">
                <div class="text-[10px] uppercase text-[var(--text-quaternary)]">Memory</div>
                <div class="mt-0.5">{{ fmtBytes(row.memoryBytes) }}</div>
              </div>
            </div>
            <div v-if="row.reason" class="mt-2 truncate text-xs text-[var(--text-tertiary)]">{{ row.reason }}</div>
          </div>
          <div v-if="runtime.redisKeys.length === 0" class="rounded-lg border border-[var(--border-default)] px-3 py-8 text-center text-sm text-[var(--text-tertiary)]">
            No keys loaded
          </div>
        </div>

        <div class="hidden max-h-[min(520px,65vh)] overflow-auto rounded-lg border border-[var(--border-default)] md:block">
          <table class="w-full min-w-[620px] text-sm">
            <thead class="sticky top-0 z-10 border-b border-[var(--border-default)] bg-[var(--surface-card)] text-left text-xs text-[var(--text-tertiary)]">
              <tr>
                <th class="px-3 py-2">Key</th>
                <th class="px-3 py-2 text-right">Size</th>
                <th class="px-3 py-2 text-right">Memory</th>
                <th class="px-3 py-2">Owner</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[var(--border-default)]">
              <tr
                v-for="row in runtime.redisKeys"
                :key="row.key"
                class="cursor-pointer hover:bg-[var(--surface-muted)]"
                :class="runtime.redisSelectedKey === row.key ? 'bg-primary-500/5' : ''"
                @click="loadKey(row)"
              >
                <td class="max-w-[420px] px-3 py-2">
                  <div class="flex min-w-0 items-center gap-2">
                    <div class="truncate font-mono text-xs text-[var(--text-primary)]" :title="row.key">
                      {{ row.key }}
                    </div>
                    <button
                      type="button"
                      class="shrink-0 text-[var(--text-quaternary)] hover:text-[var(--text-primary)]"
                      :class="copiedKey === row.key ? 'text-success-500 hover:text-success-500' : ''"
                      title="Copy key"
                      @click.stop="copyKey(row.key)"
                    >
                      <UIcon :name="copiedKey === row.key ? 'lucide:check' : 'lucide:copy'" class="h-4 w-4" />
                    </button>
                  </div>
                  <div class="mt-0.5 flex flex-wrap gap-1">
                    <UBadge color="neutral" variant="soft" size="xs">{{ row.type }}</UBadge>
                    <UBadge color="neutral" variant="soft" size="xs">{{ ttlLabel(row.ttlSeconds) }}</UBadge>
                    <UBadge v-if="row.systemKind" :color="systemKindColor(row.systemKind)" variant="soft" size="xs">
                      {{ systemKindLabel(row.systemKind) }}
                    </UBadge>
                  </div>
                </td>
                <td class="px-3 py-2 text-right">{{ row.size ?? '-' }}</td>
                <td class="px-3 py-2 text-right">{{ fmtBytes(row.memoryBytes) }}</td>
                <td class="px-3 py-2">
                  <UBadge :color="ownerColor(row)" variant="soft">
                    {{ ownerLabel(row) }}
                  </UBadge>
                </td>
              </tr>
              <tr v-if="runtime.redisKeys.length === 0">
                <td colspan="4" class="px-3 py-8 text-center text-[var(--text-tertiary)]">
                  No keys loaded
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="mt-3 flex justify-end">
          <UButton
            size="sm"
            variant="soft"
            color="neutral"
            icon="lucide:chevrons-right"
            :disabled="!canLoadMore"
            :loading="runtime.redisKeysPending"
            @click="runtime.scanRedisKeys({ reset: false })"
          >
            Load More
          </UButton>
        </div>
      </div>

      <div class="surface-card min-w-0 rounded-lg p-4">
        <div class="mb-3 flex items-center justify-between gap-3">
          <div class="font-medium text-[var(--text-primary)]">Key Editor</div>
          <UBadge v-if="selected" :color="ownerColor(selected)" variant="soft">
            {{ selectedLocked ? ownerLabel(selected) : 'editable' }}
          </UBadge>
        </div>

        <div v-if="selectedLocked" class="mb-3 rounded-lg border border-warning-400/20 bg-warning-400/5 p-3 text-sm text-warning-700 dark:text-warning-300">
          {{ selected?.reason || 'Read-only Redis key' }}
        </div>

        <form class="space-y-3" @submit.prevent="saveKey">
          <div>
            <div class="mb-1 text-xs font-medium text-[var(--text-tertiary)]">Key</div>
            <UInput v-model="formKey" class="w-full font-mono text-xs" :disabled="selectedLocked || runtime.redisWritePending" placeholder="redis:key" />
          </div>
          <div class="grid gap-3 sm:grid-cols-2">
            <div>
              <div class="mb-1 text-xs font-medium text-[var(--text-tertiary)]">Type</div>
              <USelect v-model="formType" :items="writableTypes" class="w-full" :disabled="selectedLocked || runtime.redisWritePending" />
            </div>
            <div>
              <div class="mb-1 text-xs font-medium text-[var(--text-tertiary)]">TTL seconds</div>
              <UInput v-model="formTtl" type="number" min="1" class="w-full" :disabled="selectedLocked || runtime.redisWritePending" placeholder="persistent" />
            </div>
          </div>
          <div>
            <div class="mb-1 flex items-center justify-between gap-2 text-xs font-medium text-[var(--text-tertiary)]">
              <span>Value</span>
              <span v-if="selected?.truncated">truncated</span>
            </div>
            <UTextarea v-model="formValue" :rows="8" class="w-full font-mono text-xs" :disabled="selectedLocked || runtime.redisWritePending" />
          </div>

          <div v-if="selected" class="grid grid-cols-2 gap-2 text-xs text-[var(--text-tertiary)]">
            <div>Encoding</div>
            <div class="truncate text-right font-medium">{{ selected.encoding ?? '-' }}</div>
            <div>Current TTL</div>
            <div class="text-right font-medium">{{ ttlLabel(selected.ttlSeconds) }}</div>
            <div>Preview</div>
            <div class="truncate text-right font-medium">{{ shortText(JSON.stringify(selected.value), 24, 8) }}</div>
          </div>

          <div class="flex flex-wrap justify-end gap-2">
            <UButton type="submit" icon="lucide:save" :loading="runtime.redisWritePending" :disabled="selectedLocked || !formKey.trim()">
              Save
            </UButton>
            <UButton v-if="selected" type="button" color="error" variant="soft" icon="lucide:trash-2" :disabled="!canModifySelected || runtime.redisWritePending" @click="deleteKey">
              Delete
            </UButton>
          </div>
        </form>

        <div v-if="selected" class="mt-4 border-t border-[var(--border-default)] pt-3">
          <div class="mb-2 text-xs font-medium text-[var(--text-tertiary)]">TTL Control</div>
          <div class="flex gap-2">
            <UInput v-model="ttlInput" type="number" min="1" class="min-w-0 flex-1" :disabled="!canModifySelected || runtime.redisWritePending" placeholder="seconds" />
            <UButton size="sm" icon="lucide:timer-reset" variant="soft" :disabled="!canModifySelected || runtime.redisWritePending" @click="applyTtl">
              Apply
            </UButton>
            <UButton size="sm" icon="lucide:infinity" color="neutral" variant="soft" :disabled="!canModifySelected || runtime.redisWritePending" @click="persistSelectedKey">
              Persist
            </UButton>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
