<script setup lang="ts">
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

      <div v-if="pending && alerts.length === 0" class="py-8 text-center text-sm text-[var(--text-tertiary)]">
        Loading...
      </div>

      <div v-else-if="alerts.length === 0" class="py-8 text-center text-sm text-[var(--text-tertiary)]">
        No guard rejections recorded
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-[var(--border-subtle)] text-left text-xs text-[var(--text-tertiary)]">
              <th class="pb-2 pr-3 font-medium">Time</th>
              <th class="pb-2 pr-3 font-medium">Scope</th>
              <th class="pb-2 pr-3 font-medium">Subject</th>
              <th class="pb-2 pr-3 font-medium">Route</th>
              <th class="pb-2 pr-3 font-medium">Method</th>
              <th class="pb-2 pr-3 font-medium">Error</th>
              <th class="pb-2 font-medium">Guard</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="alert in alerts"
              :key="alert.id"
              class="border-b border-[var(--border-subtle)] last:border-0"
            >
              <td class="py-2 pr-3 whitespace-nowrap text-[var(--text-tertiary)]">{{ timeAgo(alert.createdAt) }}</td>
              <td class="py-2 pr-3">
                <span class="font-medium" :class="scopeColor[alert.scope]">{{ alert.scope }}</span>
              </td>
              <td class="py-2 pr-3 font-mono text-xs">{{ alert.scopeKey }}</td>
              <td class="py-2 pr-3 text-xs">{{ alert.routePath }}</td>
              <td class="py-2 pr-3">
                <span class="rounded bg-[var(--surface-nested)] px-1.5 py-0.5 text-xs font-medium">{{ alert.method }}</span>
              </td>
              <td class="py-2 pr-3">
                <span
                  class="rounded-full px-2 py-0.5 text-xs font-medium"
                  :class="errorCodeBadge[alert.errorCode] ?? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'"
                >
                  {{ alert.errorCode }}
                </span>
              </td>
              <td class="py-2 text-xs text-[var(--text-secondary)]">{{ alert.guardName }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </CommonAnimatedGrid>
</template>
