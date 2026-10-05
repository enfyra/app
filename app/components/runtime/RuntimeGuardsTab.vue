<script setup lang="ts">
import { h } from 'vue';
import type { ColumnDef } from '@tanstack/vue-table';

type GuardAlert = {
  id: number;
  scope: 'ip' | 'user' | 'route';
  scopeKey: string;
  routePath: string;
  method: string;
  errorCode: string;
  guardName: string;
  createdAt: string;
};

type RuntimeMetricsViewModel = ReturnType<typeof useRuntimeMetrics>;

defineProps<{ runtime: RuntimeMetricsViewModel }>();

const { data, pending, execute } = useApi<{ data: GuardAlert[] }>(
  () => '/enfyra_guard_alert',
  {
    query: () => ({
      fields: ['id', 'scope', 'scopeKey', 'routePath', 'method', 'errorCode', 'guardName', 'createdAt'],
      sort: '-createdAt',
      limit: 50,
    }),
    disableErrorPage: true,
  },
);

const alerts = computed<GuardAlert[]>(() => data.value?.data ?? []);

const grouped = computed(() => {
  const map = new Map<string, { scopeKey: string; scope: string; count: number; latest: GuardAlert }>();
  for (const alert of alerts.value) {
    const key = `${alert.scope}:${alert.scopeKey}`;
    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      map.set(key, { scopeKey: alert.scopeKey, scope: alert.scope, count: 1, latest: alert });
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
});

const scopeColor: Record<string, string> = {
  ip: 'text-amber-600 dark:text-amber-400',
  user: 'text-blue-600 dark:text-blue-400',
  route: 'text-purple-600 dark:text-purple-400',
};

const errorCodeBadge: Record<string, string> = {
  RATE_LIMIT_EXCEEDED: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  IP_NOT_ALLOWED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  IP_BLOCKED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

const columns: ColumnDef<GuardAlert>[] = [
  { id: 'time', header: 'Time', cell: ({ row }) => h('span', { class: 'whitespace-nowrap text-[var(--text-tertiary)]' }, timeAgo(row.original.createdAt)) },
  { id: 'scope', header: 'Scope', cell: ({ row }) => h('span', { class: ['font-medium', scopeColor[row.original.scope]] }, row.original.scope) },
  { id: 'subject', header: 'Subject', cell: ({ row }) => h('span', { class: 'font-mono text-xs' }, row.original.scopeKey) },
  { id: 'route', header: 'Route', cell: ({ row }) => h('span', { class: 'text-xs' }, row.original.routePath) },
  { id: 'method', header: 'Method', cell: ({ row }) => h('span', { class: 'rounded bg-[var(--surface-nested)] px-1.5 py-0.5 text-xs font-medium' }, row.original.method) },
  { id: 'error', header: 'Error', cell: ({ row }) => h('span', { class: ['rounded-full px-2 py-0.5 text-xs font-medium', errorCodeBadge[row.original.errorCode] ?? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'] }, row.original.errorCode) },
  { id: 'guard', header: 'Guard', cell: ({ row }) => h('span', { class: 'text-xs text-[var(--text-secondary)]' }, row.original.guardName) },
];

onMounted(() => {
  execute();
});
</script>

<template>
  <CommonAnimatedGrid grid-class="grid gap-4">
    <!-- Repeated offenders summary -->
    <section v-if="grouped.length > 0" class="surface-card rounded-lg p-4">
      <div class="mb-3 flex items-center justify-between">
        <div class="font-medium text-[var(--text-primary)]">Repeated Offenders</div>
        <span class="text-xs text-[var(--text-tertiary)]">grouped by scope + subject</span>
      </div>
      <div class="space-y-2">
        <div
          v-for="entry in grouped.filter(g => g.count > 1)"
          :key="entry.scopeKey"
          class="flex items-center justify-between gap-3 rounded-lg border border-[var(--border-default)] px-3 py-2"
        >
          <div class="flex items-center gap-2">
            <span class="text-sm font-mono" :class="scopeColor[entry.scope]">{{ entry.scopeKey }}</span>
            <span class="text-xs text-[var(--text-tertiary)]">{{ entry.latest.guardName }}</span>
          </div>
          <span class="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-300">
            {{ entry.count }} hits
          </span>
        </div>
        <div v-if="grouped.filter(g => g.count > 1).length === 0" class="text-sm text-[var(--text-tertiary)]">
          No repeated offenders in current window
        </div>
      </div>
    </section>

    <!-- Recent alerts table -->
    <section class="surface-card rounded-lg p-4">
      <div class="mb-3 flex items-center justify-between">
        <div class="font-medium text-[var(--text-primary)]">Recent Rejections</div>
        <button
          type="button"
          class="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
          @click="execute()"
        >
          Refresh
        </button>
      </div>

      <DataTable :data="alerts" :columns="columns" :loading="pending">
        <template #toolbar><h2 class="text-sm font-medium">Recent rejections</h2></template>
        <template #empty><CommonEmptyState variant="naked" title="No guard rejections recorded" icon="lucide:shield" size="sm" /></template>
      </DataTable>
    </section>
  </CommonAnimatedGrid>
</template>
