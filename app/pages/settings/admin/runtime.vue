<script setup lang="ts">
import {
  runtimeMetricsByInstance,
  runtimeMetricsUpdatedAt,
  type RuntimeMetricsPayload,
} from '~/composables/shared/useAdminSocket';

const { registerPageHeader } = usePageHeaderRegistry();
const { me } = useAuth();
const route = useRoute();

const hasPermission = computed(() => !!me.value?.isRootAdmin);
const activeTab = ref((route.query.tab as string) || 'overview');
const baseTabItems = [
  { label: 'Overview', icon: 'i-lucide-layout-dashboard', value: 'overview' },
  { label: 'Requests', icon: 'i-lucide-radio-tower', value: 'requests' },
  { label: 'Cache', icon: 'i-lucide-refresh-cw', value: 'cache' },
  { label: 'Database', icon: 'i-lucide-database', value: 'database' },
  { label: 'Flows', icon: 'i-lucide-git-branch', value: 'flows' },
  { label: 'Workers', icon: 'i-lucide-cpu', value: 'workers' },
  { label: 'Connections', icon: 'i-lucide-network', value: 'connections' },
];
if (!baseTabItems.some((tab) => tab.value === activeTab.value)) {
  activeTab.value = 'overview';
}

watch(activeTab, (tab) => {
  navigateTo({ query: { ...route.query, tab } }, { replace: true });
});

registerPageHeader({
  title: 'Runtime Monitor',
  description: 'Live server runtime metrics',
  variant: 'default',
  gradient: 'blue',
});

const instances = computed(() =>
  Object.values(runtimeMetricsByInstance.value).sort((a, b) =>
    a.instance.id.localeCompare(b.instance.id),
  ),
);

const totals = computed(() => {
  const rows = instances.value;
  return {
    rssMb: rows.reduce((sum, item) => sum + item.instance.rssMb, 0),
    avgRssMb: rows.reduce((sum, item) => sum + (item.averages?.rssMb ?? item.instance.rssMb), 0),
    heapUsedMb: rows.reduce((sum, item) => sum + item.instance.heapUsedMb, 0),
    heapLimitMb: rows.reduce(
      (sum, item) => sum + (item.instance.heapLimitMb ?? item.instance.heapTotalMb),
      0,
    ),
    avgHeapUsedMb: rows.reduce(
      (sum, item) => sum + (item.averages?.heapUsedMb ?? item.instance.heapUsedMb),
      0,
    ),
    maxEventLoopLagMs: rows.reduce(
      (max, item) => Math.max(max, item.instance.eventLoopLagMs),
      0,
    ),
    avgEventLoopLagMs: rows.reduce(
      (sum, item) => sum + (item.averages?.eventLoopLagMs ?? item.instance.eventLoopLagMs),
      0,
    ),
    rotations: rows.reduce((sum, item) => sum + item.executor.rotationsTotal, 0),
    crashes: rows.reduce((sum, item) => sum + item.executor.crashesTotal, 0),
  };
});

const lastUpdatedLabel = computed(() => {
  if (!runtimeMetricsUpdatedAt.value) return 'Waiting';
  const seconds = Math.max(
    0,
    Math.round((Date.now() - runtimeMetricsUpdatedAt.value) / 1000),
  );
  return seconds === 0 ? 'Live' : `${seconds}s ago`;
});

const lastUpdatedAgeSec = computed(() => {
  if (!runtimeMetricsUpdatedAt.value) return Infinity;
  return Math.max(0, Math.round((Date.now() - runtimeMetricsUpdatedAt.value) / 1000));
});

const latestSampledAt = computed(() => {
  const times = instances.value
    .map((item) => Date.parse(item.sampledAt))
    .filter(Number.isFinite);
  if (times.length === 0) return null;
  return new Date(Math.max(...times));
});

const clusterStats = computed(() => {
  const rows = instances.value
    .map((item) => item.cluster)
    .filter(Boolean)
    .sort((a: any, b: any) => {
      const at = Date.parse(a.lastReconciledAt ?? '') || 0;
      const bt = Date.parse(b.lastReconciledAt ?? '') || 0;
      return bt - at;
    });
  return rows[0] ?? null;
});

const requestRows = computed(() => {
  const map = new Map<string, any>();
  for (const metrics of instances.value) {
    for (const row of metrics.app?.requests.routes ?? []) {
      const key = `${row.method}:${row.route}`;
      const current =
        map.get(key) ??
        {
          method: row.method,
          route: row.route,
          count: 0,
          rps: 0,
          p50Ms: 0,
          p95Ms: 0,
          p99Ms: 0,
          status4xx: 0,
          status5xx: 0,
        };
      current.count += row.count;
      current.rps += row.rps;
      current.p50Ms = Math.max(current.p50Ms, row.p50Ms);
      current.p95Ms = Math.max(current.p95Ms, row.p95Ms);
      current.p99Ms = Math.max(current.p99Ms, row.p99Ms);
      current.status4xx += row.status4xx;
      current.status5xx += row.status5xx;
      map.set(key, current);
    }
  }
  return [...map.values()].sort((a, b) => b.rps - a.rps).slice(0, 20);
});

const cacheReloadRows = computed(() =>
  instances.value.flatMap((metrics) =>
    (metrics.app?.cache.recent ?? []).map((row) => ({
      ...row,
      instanceId: metrics.instance.id,
    })),
  ).sort((a, b) => Date.parse(b.completedAt) - Date.parse(a.completedAt)).slice(0, 20),
);

const databaseRows = computed(() => {
  const map = new Map<string, any>();
  for (const metrics of instances.value) {
    for (const row of metrics.app?.database.queries ?? []) {
      const key = `${row.op}:${row.table}`;
      const current =
        map.get(key) ??
        {
          op: row.op,
          table: row.table,
          count: 0,
          errors: 0,
          poolAcquireTimeouts: 0,
          slow: 0,
          p95Ms: 0,
          p99Ms: 0,
        };
      current.count += row.count;
      current.errors += row.errors;
      current.poolAcquireTimeouts += row.poolAcquireTimeouts ?? 0;
      current.slow += row.slow;
      current.p95Ms = Math.max(current.p95Ms, row.p95Ms);
      current.p99Ms = Math.max(current.p99Ms, row.p99Ms);
      map.set(key, current);
    }
  }
  return [...map.values()].sort((a, b) => b.p95Ms - a.p95Ms).slice(0, 20);
});

const flowRows = computed(() => {
  const map = new Map<string, any>();
  for (const metrics of instances.value) {
    for (const row of metrics.app?.flows.rows ?? []) {
      const key = String(row.flowId);
      const current =
        map.get(key) ??
        {
          flowId: row.flowId,
          flowName: row.flowName,
          running: 0,
          completed: 0,
          failed: 0,
          p95Ms: 0,
          failedSteps: new Map<string, number>(),
          slowSteps: new Map<string, number>(),
        };
      current.running += row.running;
      current.completed += row.completed;
      current.failed += row.failed;
      current.p95Ms = Math.max(current.p95Ms, row.p95Ms);
      for (const step of row.failedSteps) {
        current.failedSteps.set(step.step, (current.failedSteps.get(step.step) ?? 0) + step.count);
      }
      for (const step of row.slowSteps) {
        current.slowSteps.set(step.step, Math.max(current.slowSteps.get(step.step) ?? 0, step.p95Ms));
      }
      map.set(key, current);
    }
  }
  return [...map.values()].map((row) => ({
    ...row,
    failedSteps: [...row.failedSteps.entries()].map(([step, count]) => ({ step, count })).sort((a, b) => b.count - a.count).slice(0, 3),
    slowSteps: [...row.slowSteps.entries()].map(([step, p95Ms]) => ({ step, p95Ms })).sort((a, b) => b.p95Ms - a.p95Ms).slice(0, 3),
  })).sort((a, b) => b.running - a.running || b.failed - a.failed || b.p95Ms - a.p95Ms).slice(0, 20);
});

const flowFailedJobRows = computed(() =>
  instances.value.flatMap((metrics) =>
    (metrics.queues.flow?.failedJobs ?? []).map((job) => ({
      ...job,
      instanceId: metrics.instance.id,
    })),
  ).sort((a, b) => (b.finishedOn ?? b.timestamp ?? 0) - (a.finishedOn ?? a.timestamp ?? 0)).slice(0, 30),
);

type RuntimeSeverity = 'ok' | 'warning' | 'error';

function severityRank(severity: RuntimeSeverity) {
  if (severity === 'error') return 2;
  if (severity === 'warning') return 1;
  return 0;
}

function maxSeverity(...values: RuntimeSeverity[]): RuntimeSeverity {
  return values.reduce((current, next) =>
    severityRank(next) > severityRank(current) ? next : current,
  'ok' as RuntimeSeverity);
}

function metricTextClass(severity: RuntimeSeverity) {
  if (severity === 'error') return 'text-error-600 dark:text-error-400';
  if (severity === 'warning') return 'text-warning-600 dark:text-warning-400';
  return 'text-[var(--text-primary)]';
}

function badgeColor(severity: RuntimeSeverity) {
  if (severity === 'error') return 'error';
  if (severity === 'warning') return 'warning';
  return 'success';
}

function updatedSeverity() {
  if (lastUpdatedAgeSec.value > 20) return 'error';
  if (lastUpdatedAgeSec.value > 6) return 'warning';
  return 'ok';
}

function heapSeverity(metrics: RuntimeMetricsPayload): RuntimeSeverity {
  const limit = metrics.instance.heapLimitMb;
  if (!limit) return 'ok';
  const ratio = metrics.instance.heapUsedMb / limit;
  if (ratio >= 0.9) return 'error';
  if (ratio >= 0.75) return 'warning';
  return 'ok';
}

function isolateHeapSeverity(metrics: RuntimeMetricsPayload): RuntimeSeverity {
  const ratio = metrics.executor.maxHeapRatio;
  if (ratio >= 0.85) return 'error';
  if (ratio >= 0.65) return 'warning';
  return 'ok';
}

function eventLoopSeverity(metrics: RuntimeMetricsPayload): RuntimeSeverity {
  const value = metrics.instance.eventLoopLagMs;
  if (value >= 200) return 'error';
  if (value >= 50) return 'warning';
  return 'ok';
}

function executorQueueSeverity(metrics: RuntimeMetricsPayload): RuntimeSeverity {
  const waiting = metrics.executor.pool.waitingTasks;
  if (waiting >= 100) return 'error';
  if (waiting > 0) return 'warning';
  return 'ok';
}

function taskLatencySeverity(metrics: RuntimeMetricsPayload): RuntimeSeverity {
  const p99 = metrics.executor.p99TaskMs;
  if (p99 >= 5000) return 'error';
  if (p99 >= 1000) return 'warning';
  return 'ok';
}

function taskErrorSeverity(metrics: RuntimeMetricsPayload): RuntimeSeverity {
  if (metrics.executor.taskTimeoutTotal > 0 || metrics.executor.crashesTotal > 0) {
    return 'error';
  }
  if (metrics.executor.taskErrorTotal > 0) return 'warning';
  return 'ok';
}

function dbSeverity(metrics: RuntimeMetricsPayload): RuntimeSeverity {
  const pending = dbPoolRows(metrics).reduce((sum, row: any) => sum + (row.pending ?? 0), 0);
  if (pending >= 100) return 'error';
  if (pending > 0) return 'warning';
  return 'ok';
}

function queueSeverity(queue: RuntimeMetricsPayload['queues'][string]): RuntimeSeverity {
  if (!queue) return 'ok';
  const total = queueTotal(queue);
  if (total >= 1000 || queue.failed >= 100) return 'error';
  if (total >= 100 || queue.failed > 0) return 'warning';
  return 'ok';
}

function contextSeverity(metrics: RuntimeMetricsPayload): RuntimeSeverity {
  return metrics.executor.pool.workers.some((worker) => (worker.contextStats.scrubFailed ?? 0) > 0)
    ? 'error'
    : 'ok';
}

function rotationSeverity(metrics: RuntimeMetricsPayload): RuntimeSeverity {
  if (metrics.executor.rotationsTotal >= 10) return 'warning';
  return 'ok';
}

function overviewSeverity(metrics: RuntimeMetricsPayload): RuntimeSeverity {
  return maxSeverity(
    heapSeverity(metrics),
    eventLoopSeverity(metrics),
  );
}

function workerSeverity(metrics: RuntimeMetricsPayload): RuntimeSeverity {
  return maxSeverity(
    isolateHeapSeverity(metrics),
    executorQueueSeverity(metrics),
    taskLatencySeverity(metrics),
    taskErrorSeverity(metrics),
    contextSeverity(metrics),
    rotationSeverity(metrics),
  );
}

function flowSeverity(metrics: RuntimeMetricsPayload): RuntimeSeverity {
  const queue = metrics.queues.flow;
  const hasFailedFlow = (metrics.app?.flows.rows ?? []).some((row) => row.failed > 0);
  return maxSeverity(queueSeverity(queue), hasFailedFlow ? 'error' : 'ok');
}

function connectionSeverity(metrics: RuntimeMetricsPayload): RuntimeSeverity {
  return maxSeverity(...connectionQueueEntries(metrics).map(([, queue]) => queueSeverity(queue)));
}

function databaseSeverity(metrics: RuntimeMetricsPayload): RuntimeSeverity {
  const dbMetrics = metrics.app?.database;
  return maxSeverity(
    dbSeverity(metrics),
    (dbMetrics?.totalPoolAcquireTimeouts ?? 0) > 0 ? 'error' : 'ok',
    (dbMetrics?.totalErrors ?? 0) > 0 ? 'error' : 'ok',
    (dbMetrics?.totalSlow ?? 0) > 0 ? 'warning' : 'ok',
  );
}

function overviewWarnings(metrics: RuntimeMetricsPayload) {
  const warnings: string[] = [];
  if (metrics.instance.eventLoopLagMs >= 50) warnings.push(`Event loop delay is ${fmtMs(metrics.instance.eventLoopLagMs)}.`);
  if (heapSeverity(metrics) !== 'ok') warnings.push(`Main heap usage is ${fmtPercent(metrics.instance.heapUsedMb / (metrics.instance.heapLimitMb || metrics.instance.heapTotalMb))} of V8 limit.`);
  return warnings;
}

function workerWarnings(metrics: RuntimeMetricsPayload) {
  const warnings: string[] = [];
  if (metrics.executor.pool.waitingTasks > 0) warnings.push(`${metrics.executor.pool.waitingTasks} executor task${metrics.executor.pool.waitingTasks > 1 ? 's are' : ' is'} waiting.`);
  if (metrics.executor.maxHeapRatio >= 0.65) warnings.push(`Isolate heap pressure is ${fmtPercent(metrics.executor.maxHeapRatio)}.`);
  if (metrics.executor.p99TaskMs >= 1000) warnings.push(`Executor p99 latency is ${fmtMs(metrics.executor.p99TaskMs)}.`);
  if (metrics.executor.taskErrorTotal > 0) warnings.push(`${metrics.executor.taskErrorTotal} executor task error${metrics.executor.taskErrorTotal > 1 ? 's' : ''}.`);
  if (metrics.executor.taskTimeoutTotal > 0) warnings.push(`${metrics.executor.taskTimeoutTotal} executor timeout${metrics.executor.taskTimeoutTotal > 1 ? 's' : ''}.`);
  if (metrics.executor.crashesTotal > 0) warnings.push(`${metrics.executor.crashesTotal} executor worker crash${metrics.executor.crashesTotal > 1 ? 'es' : ''}.`);
  if (metrics.executor.pool.workers.some((worker) => (worker.contextStats.scrubFailed ?? 0) > 0)) warnings.push('Context scrub failure detected.');
  if (metrics.executor.rotationsTotal >= 10) warnings.push(`${metrics.executor.rotationsTotal} executor rotations.`);
  return warnings;
}

function flowWarnings(metrics: RuntimeMetricsPayload) {
  const warnings: string[] = [];
  const queue = metrics.queues.flow;
  if (queue?.failed && queue.failed > 0) warnings.push(`Flow queue has ${queue.failed} retained failed job${queue.failed > 1 ? 's' : ''}.`);
  const total = queueTotal(queue);
  if (total >= 100) warnings.push(`Flow queue depth is ${total}.`);
  const failed = (metrics.app?.flows.rows ?? []).reduce((sum, row) => sum + row.failed, 0);
  if (failed > 0) warnings.push(`${failed} flow execution${failed > 1 ? 's have' : ' has'} failed.`);
  return warnings;
}

function databaseWarnings(metrics: RuntimeMetricsPayload) {
  const warnings: string[] = [];
  const pendingDb = dbPoolRows(metrics).reduce((sum, row: any) => sum + (row.pending ?? 0), 0);
  const dbMetrics = metrics.app?.database;
  if (pendingDb > 0) warnings.push(`DB pool has ${pendingDb} pending request${pendingDb > 1 ? 's' : ''}.`);
  if ((dbMetrics?.totalPoolAcquireTimeouts ?? 0) > 0) warnings.push(`${dbMetrics?.totalPoolAcquireTimeouts} DB pool acquire timeout${dbMetrics?.totalPoolAcquireTimeouts === 1 ? '' : 's'}.`);
  if ((dbMetrics?.totalErrors ?? 0) > 0) warnings.push(`${dbMetrics?.totalErrors} query error${dbMetrics?.totalErrors === 1 ? '' : 's'}.`);
  if ((dbMetrics?.totalSlow ?? 0) > 0) warnings.push(`${dbMetrics?.totalSlow} slow quer${dbMetrics?.totalSlow === 1 ? 'y' : 'ies'}.`);
  return warnings;
}

function connectionWarnings(metrics: RuntimeMetricsPayload) {
  const warnings: string[] = [];
  for (const [name, queue] of connectionQueueEntries(metrics)) {
    if (!queue) continue;
    if (queue.failed > 0) warnings.push(`${name} queue has ${queue.failed} retained failed job${queue.failed > 1 ? 's' : ''}.`);
    const total = queueTotal(queue);
    if (total >= 100) warnings.push(`${name} queue depth is ${total}.`);
  }
  return warnings;
}

function requestTabSeverity(): RuntimeSeverity {
  return maxSeverity(
    ...requestRows.value.map((row) =>
      row.status5xx > 0 || row.p99Ms >= 5000
        ? 'error'
        : row.status4xx > 0 || row.p95Ms >= 1000 || row.p99Ms >= 1000
          ? 'warning'
          : 'ok',
    ),
  );
}

function requestIssueCount() {
  return requestRows.value.filter(
    (row) =>
      row.status5xx > 0 ||
      row.status4xx > 0 ||
      row.p95Ms >= 1000 ||
      row.p99Ms >= 1000,
  ).length;
}

function cacheTabSeverity(): RuntimeSeverity {
  return cacheReloadRows.value.some((row) => row.status === 'failed')
    ? 'error'
    : 'ok';
}

function cacheIssueCount() {
  return cacheReloadRows.value.filter((row) => row.status === 'failed').length;
}

function tabSeverity(tab: string): RuntimeSeverity {
  switch (tab) {
    case 'overview':
      return maxSeverity(clusterSeverity(), ...instances.value.map(overviewSeverity));
    case 'requests':
      return requestTabSeverity();
    case 'cache':
      return cacheTabSeverity();
    case 'database':
      return maxSeverity(...instances.value.map(databaseSeverity));
    case 'flows':
      return maxSeverity(...instances.value.map(flowSeverity));
    case 'workers':
      return maxSeverity(...instances.value.map(workerSeverity));
    case 'connections':
      return maxSeverity(...instances.value.map(connectionSeverity));
    default:
      return 'ok';
  }
}

function tabIssueCount(tab: string) {
  switch (tab) {
    case 'overview':
      return (
        (clusterSeverity() === 'ok' ? 0 : 1) +
        instances.value.reduce((sum, metrics) => sum + overviewWarnings(metrics).length, 0)
      );
    case 'requests':
      return requestIssueCount();
    case 'cache':
      return cacheIssueCount();
    case 'database':
      return instances.value.reduce((sum, metrics) => sum + databaseWarnings(metrics).length, 0);
    case 'flows':
      return instances.value.reduce((sum, metrics) => sum + flowWarnings(metrics).length, 0);
    case 'workers':
      return instances.value.reduce((sum, metrics) => sum + workerWarnings(metrics).length, 0);
    case 'connections':
      return instances.value.reduce((sum, metrics) => sum + connectionWarnings(metrics).length, 0);
    default:
      return 0;
  }
}

const tabItems = computed(() =>
  baseTabItems.map((item) => {
    const count = tabIssueCount(item.value);
    return {
      ...item,
      label: count > 0 ? `${item.label} (${count})` : item.label,
    };
  }),
);

function fmtNumber(value: number, digits = 0) {
  if (!Number.isFinite(value)) return '-';
  return value.toLocaleString(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

function fmtMs(value: number) {
  return `${fmtNumber(value, value < 10 ? 1 : 0)}ms`;
}

function fmtSec(value: number) {
  return `${fmtNumber(value / 1000, value < 10_000 ? 1 : 0)}s`;
}

function fmtMb(value: number) {
  return `${fmtNumber(value, value < 100 ? 1 : 0)}MB`;
}

function fmtPercent(value: number) {
  return `${fmtNumber(value * 100, 0)}%`;
}

function fmtDateTime(value: string | Date | null | undefined) {
  if (!value) return '-';
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return '-';
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function sampleAgeLabel(metrics: RuntimeMetricsPayload) {
  const sampledAt = Date.parse(metrics.sampledAt);
  if (!Number.isFinite(sampledAt)) return '-';
  const seconds = Math.max(0, Math.round((Date.now() - sampledAt) / 1000));
  return seconds === 0 ? 'now' : `${seconds}s ago`;
}

function averageWindowLabel(metrics: RuntimeMetricsPayload) {
  const samples = metrics.averages?.samples ?? 0;
  if (!samples) return 'avg warming up';
  const seconds = Math.round((metrics.averages?.onlineMs ?? 0) / 1000);
  if (seconds >= 60) return `avg since boot ${Math.round(seconds / 60)}m`;
  return `avg since boot ${seconds}s`;
}

function queueTotal(queue: RuntimeMetricsPayload['queues'][string]) {
  if (!queue) return 0;
  return queue.waiting + queue.active + queue.delayed + queue.failed;
}

function dbPoolRows(metrics: RuntimeMetricsPayload) {
  const pool = metrics.db?.pool;
  if (!pool) return [];
  if (pool.master || Array.isArray(pool.replicas)) {
    return [
      { name: 'master', ...(pool.master ?? {}) },
      ...(pool.replicas ?? []).map((replica: any, index: number) => ({
        name: `replica ${index + 1}`,
        healthy: replica.healthy,
        ...(replica.pool ?? {}),
      })),
    ];
  }
  return [{ name: 'pool', ...pool }];
}

function websocketRows(metrics: RuntimeMetricsPayload) {
  return metrics.websocket?.namespaces ?? [];
}

function connectionQueueEntries(metrics: RuntimeMetricsPayload) {
  return Object.entries(metrics.queues).filter(([name]) => name !== 'flow');
}

function hardwareMemoryLabel(metrics: RuntimeMetricsPayload) {
  const effective = metrics.hardware?.effectiveMemoryMb;
  const host = metrics.hardware?.hostMemoryMb;
  if (!effective) return '-';
  if (!host || Math.abs(host - effective) < 1) return fmtMb(effective);
  return `${fmtMb(effective)} / ${fmtMb(host)}`;
}

function hardwareCpuLabel(metrics: RuntimeMetricsPayload) {
  const effective = metrics.hardware?.effectiveCpuCount;
  const host = metrics.hardware?.hostCpuCount;
  if (!effective) return '-';
  if (!host || host === effective) return String(effective);
  return `${effective} / ${host}`;
}

function clusterSeverity(): RuntimeSeverity {
  const cluster = clusterStats.value;
  if (!cluster?.enabled) return 'ok';
  if (cluster.instances.some((item: any) => item.ageMs > cluster.staleAfterMs * 0.75)) {
    return 'warning';
  }
  return 'ok';
}

const tabGuides = {
  overview: {
    title: 'Overview Guide',
    description: 'These numbers describe the health of each live server instance at the sampled time.',
    groups: [
      {
        title: 'Instance And Time',
        items: [
          ['Instances', 'How many server processes have sent runtime samples to this admin session. In PM2 cluster mode this should match the live instance count.'],
          ['Sampled at', 'The exact server timestamp when the snapshot was measured. If this is old, the admin socket is stale or the instance stopped emitting.'],
          ['Avg since boot', 'Average from this process boot until now. The counters are stored in Redis and reset when that process starts again.'],
          ['PID / Uptime', 'Use PID to match PM2 or OS logs. Uptime tells whether the process has restarted recently.'],
          ['Cluster active', 'Active instance count detected from the same Redis heartbeat set used by SQL pool coordination. This is the source of truth for server process count.'],
          ['Heartbeat age', 'How old each instance heartbeat is. Near the stale threshold means the process may be unhealthy or shutting down.'],
        ],
      },
      {
        title: 'Memory And Event Loop',
        items: [
          ['RSS', 'Total RAM currently held by the process, including Node.js, native modules, buffers, isolated-vm, and child/runtime overhead.'],
          ['Heap', 'Main Node.js JavaScript heap used / committed. High used compared with the V8 limit is a leak or retained object warning.'],
          ['Isolate heap', 'Highest live heap pressure from dynamic script isolates. High values mean user/runtime code is close to isolate memory limits.'],
          ['Event loop', 'Main-thread scheduling delay. Sustained high delay means the process is busy or blocked, even if CPU/RAM still look acceptable.'],
        ],
      },
      {
        title: 'Hardware / Tuning',
        items: [
          ['RAM / CPU', 'Effective resources detected by Enfyra for auto-tuning. If host and effective differ, the process is running under container/cgroup limits.'],
          ['Workers', 'Executor worker capacity selected from effective CPU and memory. This is capacity, not current request count.'],
          ['Task cap', 'Maximum concurrent executor tasks per worker. Waiting tasks mean demand is above this capacity at that moment.'],
          ['Warm isolates', 'Prepared isolated-vm contexts kept ready per worker to reduce cold execution overhead.'],
          ['SQL target pool', 'Total SQL pool max assigned per process after Enfyra reserves DB connections and divides capacity across active instances.'],
        ],
      },
    ],
  },
  workers: {
    title: 'Workers Guide',
    description: 'These numbers explain how the executor engine is using workers and reusable isolated contexts.',
    groups: [
      {
        title: 'Executor Load',
        items: [
          ['Workers', 'Running executor workers / configured capacity. Fewer running workers than capacity means workers are still booting, draining, or crashed.'],
          ['Active now', 'Executor tasks currently running at the sample instant. Zero is normal when no script/flow/hook is executing.'],
          ['Waiting', 'Executor tasks queued because all worker slots are busy. Sustained waiting means the executor is saturated.'],
          ['Task p95 / p99', 'Slow-tail execution latency. High p99 with low waiting usually points to slow user logic; high p99 with waiting points to saturation.'],
          ['Errors', 'Task errors / timeouts since process start. Any timeout deserves inspection because it can hold slots longer than expected.'],
        ],
      },
      {
        title: 'Context Reuse',
        items: [
          ['Active', 'Reusable isolated contexts currently checked out by running tasks.'],
          ['Idle', 'Prepared contexts available for immediate reuse. Idle above zero means the pool is warm.'],
          ['Created', 'Contexts created since worker boot. Fast growth under steady traffic means reuse is not keeping up.'],
          ['Reused', 'Successful context reuses. This should grow under normal load and confirms the pool is reducing cold-start overhead.'],
          ['Scrub failed', 'Context cleanup failed before reuse. Any non-zero value is dangerous because isolation guarantees may be compromised.'],
        ],
      },
    ],
  },
  requests: {
    title: 'Requests Guide',
    description: 'These numbers show API pressure and slow/erroring routes across live instances.',
    groups: [
      {
        title: 'Route Latency',
        items: [
          ['RPS', 'Average requests per second since each process booted, aggregated across live samples.'],
          ['p50 / p95 / p99', 'Latency percentiles. p50 is normal traffic; p95/p99 show tail latency that users usually feel during incidents.'],
          ['4xx / 5xx', 'Client and server error counts. 5xx means backend failures; rising 4xx can mean auth, validation, or client integration issues.'],
        ],
      },
    ],
  },
  cache: {
    title: 'Cache Guide',
    description: 'These rows show recent metadata/cache reload chains and where they spent time or failed.',
    groups: [
      {
        title: 'Reload Health',
        items: [
          ['Flow', 'The dominant reload area, such as metadata, route, graphql, or all.'],
          ['Steps', 'Each cache step run during the reload, with per-step duration and failures.'],
          ['Instance', 'The server process that recorded this reload. In multi-instance mode, remote invalidations should appear per receiving instance.'],
          ['Failed step', 'A failed reload can leave runtime caches stale; inspect the step name before debugging endpoint symptoms.'],
        ],
      },
    ],
  },
  database: {
    title: 'Database Guide',
    description: 'These metrics show QueryBuilder pressure, slow operations, and DB/query errors.',
    groups: [
      {
        title: 'Query Path',
        items: [
          ['Operation', 'QueryBuilder operation such as find, insert, update, delete, or raw.'],
          ['Slow', 'Count of operations slower than the server threshold. Slow query count plus DB pool pending usually means the DB path is the bottleneck.'],
          ['Errors', 'Query errors captured at the QueryBuilder boundary.'],
          ['Pool timeout', 'Queries that failed while waiting for a DB connection from the pool. This usually means pool capacity, long transactions, or slow queries are blocking new work.'],
          ['p95 / p99', 'Slow-tail query latency per table/operation.'],
        ],
      },
    ],
  },
  flows: {
    title: 'Flows Guide',
    description: 'These metrics show flow execution health and problematic steps.',
    groups: [
      {
        title: 'Execution Health',
        items: [
          ['Running', 'Flow executions currently running in workers.'],
          ['Completed / failed', 'Execution outcomes since process boot.'],
          ['p95', 'Slow-tail total flow duration.'],
          ['Failed steps', 'Step keys that failed most often. These are usually the first place to inspect.'],
          ['Slow steps', 'Step keys with highest p95 duration.'],
        ],
      },
    ],
  },
  connections: {
    title: 'Connections Guide',
    description: 'These numbers separate live sockets, async queues, and database pool pressure.',
    groups: [
      {
        title: 'WebSocket',
        items: [
          ['Connected', 'Live Socket.IO connections attached to this process and namespace. This is not a queue count.'],
          ['Users', 'Distinct authenticated user ids currently seen in that namespace on this process.'],
          ['Multi-instance', 'Each process reports its own local socket count; the summary is built by receiving samples from all live instances through the Redis Socket.IO adapter.'],
        ],
      },
      {
        title: 'Queues',
        items: [
          ['websocketConnection', 'Queued websocket connection handler jobs, not current connected sockets.'],
          ['websocketEvent', 'Queued websocket event handler jobs, not emitted websocket messages.'],
          ['failed', 'Retained failed jobs. A failed count can stay visible after the original incident until queue retention removes it.'],
        ],
      },
      {
        title: 'DB Pool',
        items: [
          ['Used', 'Connections currently checked out by queries or transactions.'],
          ['Free', 'Connections immediately available in the pool.'],
          ['Pending', 'Requests waiting for a DB connection. Any sustained pending count means DB pool capacity or query duration is the bottleneck.'],
        ],
      },
    ],
  },
};

const activeGuide = computed(() => {
  return tabGuides[activeTab.value as keyof typeof tabGuides] ?? tabGuides.overview;
});
</script>

<template>
  <div v-if="hasPermission" class="max-w-[1000px] space-y-6 px-4 pb-10 sm:px-6 lg:px-0">
    <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      <div class="surface-card rounded-lg p-4">
        <div class="text-xs font-medium text-[var(--text-tertiary)]">Instances</div>
        <div class="mt-2 text-2xl font-semibold" :class="metricTextClass(clusterSeverity())">
          {{ clusterStats?.enabled ? clusterStats.activeCount : instances.length }}
        </div>
        <div v-if="clusterStats?.enabled" class="mt-1 text-xs text-[var(--text-tertiary)]">cluster active</div>
      </div>
      <div class="surface-card rounded-lg p-4">
        <div class="text-xs font-medium text-[var(--text-tertiary)]">RSS</div>
        <div class="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{{ fmtMb(totals.rssMb) }}</div>
        <div class="mt-1 text-xs text-[var(--text-tertiary)]">avg {{ fmtMb(totals.avgRssMb) }}</div>
      </div>
      <div class="surface-card rounded-lg p-4">
        <div class="text-xs font-medium text-[var(--text-tertiary)]">Heap</div>
        <div
          class="mt-2 text-2xl font-semibold"
          :class="metricTextClass(totals.heapLimitMb > 0 && totals.heapUsedMb / totals.heapLimitMb >= 0.9 ? 'error' : totals.heapLimitMb > 0 && totals.heapUsedMb / totals.heapLimitMb >= 0.75 ? 'warning' : 'ok')"
        >
          {{ fmtMb(totals.heapUsedMb) }}
        </div>
        <div class="mt-1 text-xs text-[var(--text-tertiary)]">
          avg {{ fmtMb(totals.avgHeapUsedMb) }}
        </div>
      </div>
      <div class="surface-card rounded-lg p-4">
        <div class="text-xs font-medium text-[var(--text-tertiary)]">Event Loop</div>
        <div
          class="mt-2 text-2xl font-semibold"
          :class="metricTextClass(totals.maxEventLoopLagMs >= 200 ? 'error' : totals.maxEventLoopLagMs >= 50 ? 'warning' : 'ok')"
        >
          {{ fmtMs(totals.maxEventLoopLagMs) }}
        </div>
        <div class="mt-1 text-xs text-[var(--text-tertiary)]">avg {{ fmtMs(totals.avgEventLoopLagMs / Math.max(instances.length, 1)) }}</div>
      </div>
      <div class="surface-card rounded-lg p-4">
        <div class="text-xs font-medium text-[var(--text-tertiary)]">Updated</div>
        <div class="mt-2 text-2xl font-semibold" :class="metricTextClass(updatedSeverity())">{{ lastUpdatedLabel }}</div>
        <div class="mt-1 truncate text-xs text-[var(--text-tertiary)]">{{ fmtDateTime(latestSampledAt) }}</div>
      </div>
    </div>

    <CommonEmptyState
      v-if="instances.length === 0"
      title="No runtime metrics"
      description="The admin websocket has not received a runtime sample yet."
      icon="lucide:activity"
      size="md"
    />

    <template v-else>
      <UTabs v-model="activeTab" :items="tabItems" :content="false" variant="link" color="neutral" />

      <div v-if="activeTab === 'overview'" class="grid gap-4">
        <section v-if="clusterStats?.enabled" class="surface-card rounded-lg p-4">
          <div class="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-default)] pb-3">
            <div>
              <div class="font-medium text-[var(--text-primary)]">Cluster Instances</div>
              <div class="mt-1 text-xs text-[var(--text-tertiary)]">
                SQL pool coordination heartbeat · stale after {{ fmtSec(clusterStats.staleAfterMs) }}
              </div>
            </div>
            <UBadge :color="badgeColor(clusterSeverity())" variant="soft">
              {{ clusterSeverity() === 'warning' ? 'Check samples' : 'Coordinated' }}
            </UBadge>
          </div>

          <div class="mt-4 grid gap-3 sm:grid-cols-2">
            <div class="rounded-lg border border-[var(--border-default)] p-3">
              <div class="text-xs font-medium text-[var(--text-tertiary)]">Coordination</div>
              <div class="mt-2 grid grid-cols-2 gap-2 text-sm">
                <div>Active instances</div>
                <div class="text-right font-medium">{{ clusterStats.activeCount }}</div>
                <div>Heartbeat every</div>
                <div class="text-right font-medium">{{ fmtSec(clusterStats.heartbeatIntervalMs) }}</div>
                <div>Reconcile every</div>
                <div class="text-right font-medium">{{ fmtSec(clusterStats.reconcileIntervalMs) }}</div>
              </div>
            </div>

            <div class="rounded-lg border border-[var(--border-default)] p-3">
              <div class="text-xs font-medium text-[var(--text-tertiary)]">SQL Pool Budget</div>
              <div class="mt-2 grid grid-cols-2 gap-2 text-sm">
                <div>DB max connections</div>
                <div class="text-right font-medium">{{ clusterStats.serverMaxConnections ?? '-' }}</div>
                <div>Reserved</div>
                <div class="text-right font-medium">{{ clusterStats.reserveConnections ?? '-' }}</div>
                <div>Target / instance</div>
                <div class="text-right font-medium">{{ clusterStats.targetPoolMax ?? '-' }}</div>
                <div>Last reconciled</div>
                <div class="truncate text-right font-medium">{{ fmtDateTime(clusterStats.lastReconciledAt) }}</div>
              </div>
            </div>
          </div>

          <div class="mt-4 rounded-lg border border-[var(--border-default)]">
            <div class="border-b border-[var(--border-default)] px-3 py-2 text-xs font-medium text-[var(--text-tertiary)]">
              Heartbeats
            </div>
            <div class="divide-y divide-[var(--border-default)]">
              <div
                v-for="item in clusterStats.instances"
                :key="item.id"
                class="grid gap-2 px-3 py-2 text-xs sm:grid-cols-[1fr_170px_100px]"
              >
                <div class="truncate font-medium text-[var(--text-primary)]">{{ item.id }}</div>
                <div class="text-[var(--text-tertiary)]">{{ fmtDateTime(item.lastSeenAt) }}</div>
                <div
                  class="font-medium"
                  :class="metricTextClass(item.ageMs > clusterStats.staleAfterMs * 0.75 ? 'warning' : 'ok')"
                >
                  {{ fmtSec(item.ageMs) }} ago
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          v-for="metrics in instances"
          :key="metrics.instance.id"
          class="surface-card rounded-lg p-4"
        >
          <div class="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-default)] pb-3">
            <div class="min-w-0">
              <div class="truncate font-medium text-[var(--text-primary)]">
                {{ metrics.instance.id }}
              </div>
              <div class="mt-1 text-xs text-[var(--text-tertiary)]">
                pid {{ metrics.instance.pid }} · uptime {{ fmtNumber(metrics.instance.uptimeSec / 60, 1) }}m
              </div>
              <div class="mt-1 text-xs text-[var(--text-tertiary)]">
                sampled {{ fmtDateTime(metrics.sampledAt) }} · {{ sampleAgeLabel(metrics) }}
              </div>
              <div class="mt-1 text-xs text-[var(--text-tertiary)]">
                {{ averageWindowLabel(metrics) }} · kept in Redis
              </div>
            </div>
            <UBadge :color="badgeColor(overviewSeverity(metrics))" variant="soft">
              {{ overviewSeverity(metrics) === 'error' ? 'Critical' : overviewSeverity(metrics) === 'warning' ? 'Attention' : 'Healthy' }}
            </UBadge>
          </div>

          <div
            v-if="overviewWarnings(metrics).length > 0"
            class="mt-3 rounded-lg border border-warning-400/20 bg-warning-400/5 p-3"
          >
            <div class="flex items-center gap-2 text-sm font-medium text-warning-600 dark:text-warning-400">
              <UIcon name="lucide:triangle-alert" class="h-4 w-4" />
              Overview warnings
            </div>
            <ul class="mt-2 space-y-1 text-sm text-[var(--text-secondary)]">
              <li v-for="warning in overviewWarnings(metrics)" :key="warning" class="flex gap-2">
                <span class="text-warning-600 dark:text-warning-400">•</span>
                <span>{{ warning }}</span>
              </li>
            </ul>
          </div>

          <div class="mt-4 grid gap-3 sm:grid-cols-2">
            <div class="rounded-lg border border-[var(--border-default)] p-3">
              <div class="text-xs font-medium text-[var(--text-tertiary)]">Hardware / Tuning</div>
              <div class="mt-2 grid grid-cols-2 gap-2 text-sm">
                <div>RAM</div>
                <div class="text-right font-medium">{{ hardwareMemoryLabel(metrics) }}</div>
                <div>CPU</div>
                <div class="text-right font-medium">{{ hardwareCpuLabel(metrics) }}</div>
                <div>Workers</div>
                <div class="text-right font-medium">{{ metrics.executor.tuning.maxConcurrentWorkers }}</div>
                <div>Isolate limit</div>
                <div class="text-right font-medium">{{ fmtMb(metrics.executor.tuning.isolateMemoryLimitMb) }}</div>
                <div>Task cap</div>
                <div class="text-right font-medium">{{ metrics.executor.tuning.tasksPerWorkerCap }} / worker</div>
                <div>Warm isolates</div>
                <div class="text-right font-medium">{{ metrics.executor.tuning.isolatePoolSize }} / worker</div>
              </div>
            </div>

            <div class="rounded-lg border border-[var(--border-default)] p-3">
              <div class="text-xs font-medium text-[var(--text-tertiary)]">Memory</div>
              <div class="mt-2 grid grid-cols-2 gap-2 text-sm">
                <div>RSS</div>
                <div class="text-right font-medium">{{ fmtMb(metrics.instance.rssMb) }}</div>
                <div>RSS avg</div>
                <div class="text-right font-medium">{{ fmtMb(metrics.averages?.rssMb ?? metrics.instance.rssMb) }}</div>
                <div>Heap</div>
                <div class="text-right font-medium" :class="metricTextClass(heapSeverity(metrics))">{{ fmtMb(metrics.instance.heapUsedMb) }} / {{ fmtMb(metrics.instance.heapTotalMb) }}</div>
                <div>Heap avg</div>
                <div class="text-right font-medium">{{ fmtMb(metrics.averages?.heapUsedMb ?? metrics.instance.heapUsedMb) }}</div>
                <div>Isolate heap</div>
                <div class="text-right font-medium" :class="metricTextClass(isolateHeapSeverity(metrics))">{{ fmtPercent(metrics.executor.maxHeapRatio) }}</div>
                <div>Isolate avg</div>
                <div class="text-right font-medium">{{ fmtPercent(metrics.averages?.executorMaxHeapRatio ?? metrics.executor.maxHeapRatio) }}</div>
                <div>Event loop</div>
                <div class="text-right font-medium" :class="metricTextClass(eventLoopSeverity(metrics))">{{ fmtMs(metrics.instance.eventLoopLagMs) }}</div>
                <div>Event loop avg</div>
                <div class="text-right font-medium">{{ fmtMs(metrics.averages?.eventLoopLagMs ?? metrics.instance.eventLoopLagMs) }}</div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div v-else-if="activeTab === 'requests'" class="surface-card rounded-lg p-4">
        <div class="mb-3 font-medium text-[var(--text-primary)]">Request/API Metrics</div>
        <div class="overflow-x-auto rounded-lg border border-[var(--border-default)]">
          <table class="w-full min-w-[760px] text-sm">
            <thead class="border-b border-[var(--border-default)] text-left text-xs text-[var(--text-tertiary)]">
              <tr>
                <th class="px-3 py-2">Route</th>
                <th class="px-3 py-2 text-right">RPS</th>
                <th class="px-3 py-2 text-right">p50</th>
                <th class="px-3 py-2 text-right">p95</th>
                <th class="px-3 py-2 text-right">p99</th>
                <th class="px-3 py-2 text-right">4xx</th>
                <th class="px-3 py-2 text-right">5xx</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[var(--border-default)]">
              <tr v-for="row in requestRows" :key="`${row.method}:${row.route}`">
                <td class="px-3 py-2">
                  <span class="font-medium">{{ row.method }}</span>
                  <span class="ml-2 text-[var(--text-tertiary)]">{{ row.route }}</span>
                </td>
                <td class="px-3 py-2 text-right font-medium">{{ fmtNumber(row.rps, 2) }}</td>
                <td class="px-3 py-2 text-right">{{ fmtMs(row.p50Ms) }}</td>
                <td class="px-3 py-2 text-right" :class="metricTextClass(row.p95Ms >= 1000 ? 'warning' : 'ok')">{{ fmtMs(row.p95Ms) }}</td>
                <td class="px-3 py-2 text-right" :class="metricTextClass(row.p99Ms >= 5000 ? 'error' : row.p99Ms >= 1000 ? 'warning' : 'ok')">{{ fmtMs(row.p99Ms) }}</td>
                <td class="px-3 py-2 text-right" :class="metricTextClass(row.status4xx > 0 ? 'warning' : 'ok')">{{ row.status4xx }}</td>
                <td class="px-3 py-2 text-right" :class="metricTextClass(row.status5xx > 0 ? 'error' : 'ok')">{{ row.status5xx }}</td>
              </tr>
              <tr v-if="requestRows.length === 0">
                <td colspan="7" class="px-3 py-8 text-center text-[var(--text-tertiary)]">No request metrics yet</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div v-else-if="activeTab === 'cache'" class="surface-card rounded-lg p-4">
        <div class="mb-3 font-medium text-[var(--text-primary)]">Cache Reload Health</div>
        <div class="grid gap-3">
          <div v-for="row in cacheReloadRows" :key="`${row.instanceId}:${row.completedAt}:${row.flow}`" class="rounded-lg border border-[var(--border-default)] p-3">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div class="font-medium text-[var(--text-primary)]">{{ row.flow }} · {{ row.table }}</div>
                <div class="mt-1 text-xs text-[var(--text-tertiary)]">{{ row.instanceId }} · {{ fmtDateTime(row.completedAt) }}</div>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-sm font-medium">{{ fmtMs(row.durationMs) }}</span>
                <UBadge :color="row.status === 'failed' ? 'error' : 'success'" variant="soft">{{ row.status }}</UBadge>
              </div>
            </div>
            <div class="mt-3 grid gap-2 sm:grid-cols-2">
              <div v-for="step in row.steps" :key="`${row.completedAt}:${step.name}`" class="flex items-center justify-between gap-3 rounded-md border border-[var(--border-default)] px-2 py-1 text-xs">
                <span class="truncate" :class="metricTextClass(step.status === 'failed' ? 'error' : 'ok')">{{ step.name }}</span>
                <span>{{ fmtMs(step.durationMs) }}</span>
              </div>
            </div>
            <div v-if="row.error" class="mt-2 text-xs text-error-600 dark:text-error-400">{{ row.error }}</div>
          </div>
          <div v-if="cacheReloadRows.length === 0" class="py-8 text-center text-sm text-[var(--text-tertiary)]">No cache reloads recorded yet</div>
        </div>
      </div>

      <div v-else-if="activeTab === 'database'" class="surface-card rounded-lg p-4">
        <div class="mb-3 font-medium text-[var(--text-primary)]">Query/DB Slow Path</div>
        <div class="mb-4 grid gap-3">
          <div v-for="metrics in instances" :key="`db-${metrics.instance.id}`" class="rounded-lg border border-[var(--border-default)] p-3">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div class="font-medium text-[var(--text-primary)]">{{ metrics.instance.id }}</div>
              <UBadge :color="badgeColor(databaseSeverity(metrics))" variant="soft">
                {{ databaseSeverity(metrics) === 'error' ? 'Critical' : databaseSeverity(metrics) === 'warning' ? 'Attention' : 'Healthy' }}
              </UBadge>
            </div>
            <div v-if="databaseWarnings(metrics).length > 0" class="mt-3 rounded-lg border border-warning-400/20 bg-warning-400/5 p-3">
              <div class="flex items-center gap-2 text-sm font-medium text-warning-600 dark:text-warning-400">
                <UIcon name="lucide:triangle-alert" class="h-4 w-4" />
                Database warnings
              </div>
              <ul class="mt-2 space-y-1 text-sm text-[var(--text-secondary)]">
                <li v-for="warning in databaseWarnings(metrics)" :key="warning" class="flex gap-2">
                  <span class="text-warning-600 dark:text-warning-400">•</span>
                  <span>{{ warning }}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div class="overflow-x-auto rounded-lg border border-[var(--border-default)]">
          <table class="w-full min-w-[680px] text-sm">
            <thead class="border-b border-[var(--border-default)] text-left text-xs text-[var(--text-tertiary)]">
              <tr>
                <th class="px-3 py-2">Operation</th>
                <th class="px-3 py-2 text-right">Count</th>
                <th class="px-3 py-2 text-right">Slow</th>
                <th class="px-3 py-2 text-right">Errors</th>
                <th class="px-3 py-2 text-right">Pool timeout</th>
                <th class="px-3 py-2 text-right">p95</th>
                <th class="px-3 py-2 text-right">p99</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[var(--border-default)]">
              <tr v-for="row in databaseRows" :key="`${row.op}:${row.table}`">
                <td class="px-3 py-2">
                  <span class="font-medium">{{ row.op }}</span>
                  <span class="ml-2 text-[var(--text-tertiary)]">{{ row.table }}</span>
                </td>
                <td class="px-3 py-2 text-right">{{ row.count }}</td>
                <td class="px-3 py-2 text-right" :class="metricTextClass(row.slow > 0 ? 'warning' : 'ok')">{{ row.slow }}</td>
                <td class="px-3 py-2 text-right" :class="metricTextClass(row.errors > 0 ? 'error' : 'ok')">{{ row.errors }}</td>
                <td class="px-3 py-2 text-right" :class="metricTextClass(row.poolAcquireTimeouts > 0 ? 'error' : 'ok')">{{ row.poolAcquireTimeouts }}</td>
                <td class="px-3 py-2 text-right">{{ fmtMs(row.p95Ms) }}</td>
                <td class="px-3 py-2 text-right">{{ fmtMs(row.p99Ms) }}</td>
              </tr>
              <tr v-if="databaseRows.length === 0">
                <td colspan="7" class="px-3 py-8 text-center text-[var(--text-tertiary)]">No query metrics yet</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div v-else-if="activeTab === 'flows'" class="surface-card rounded-lg p-4">
        <div class="mb-3 font-medium text-[var(--text-primary)]">Flow Execution Health</div>
        <div class="mb-4 grid gap-3">
          <div v-for="metrics in instances" :key="`flow-${metrics.instance.id}`" class="rounded-lg border border-[var(--border-default)] p-3">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div class="font-medium text-[var(--text-primary)]">{{ metrics.instance.id }}</div>
                <div class="mt-1 text-xs text-[var(--text-tertiary)]">
                  queue {{ queueTotal(metrics.queues.flow) }} · active {{ metrics.queues.flow?.active ?? 0 }} · failed {{ metrics.queues.flow?.failed ?? 0 }}
                </div>
              </div>
              <UBadge :color="badgeColor(flowSeverity(metrics))" variant="soft">
                {{ flowSeverity(metrics) === 'error' ? 'Critical' : flowSeverity(metrics) === 'warning' ? 'Attention' : 'Healthy' }}
              </UBadge>
            </div>
            <div v-if="flowWarnings(metrics).length > 0" class="mt-3 rounded-lg border border-warning-400/20 bg-warning-400/5 p-3">
              <div class="flex items-center gap-2 text-sm font-medium text-warning-600 dark:text-warning-400">
                <UIcon name="lucide:triangle-alert" class="h-4 w-4" />
                Flow warnings
              </div>
              <ul class="mt-2 space-y-1 text-sm text-[var(--text-secondary)]">
                <li v-for="warning in flowWarnings(metrics)" :key="warning" class="flex gap-2">
                  <span class="text-warning-600 dark:text-warning-400">•</span>
                  <span>{{ warning }}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div class="overflow-x-auto rounded-lg border border-[var(--border-default)]">
          <table class="w-full min-w-[780px] text-sm">
            <thead class="border-b border-[var(--border-default)] text-left text-xs text-[var(--text-tertiary)]">
              <tr>
                <th class="px-3 py-2">Flow</th>
                <th class="px-3 py-2 text-right">Running</th>
                <th class="px-3 py-2 text-right">Completed</th>
                <th class="px-3 py-2 text-right">Failed</th>
                <th class="px-3 py-2 text-right">p95</th>
                <th class="px-3 py-2">Failed steps</th>
                <th class="px-3 py-2">Slow steps</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[var(--border-default)]">
              <tr v-for="row in flowRows" :key="row.flowId">
                <td class="px-3 py-2 font-medium">{{ row.flowName }}</td>
                <td class="px-3 py-2 text-right">{{ row.running }}</td>
                <td class="px-3 py-2 text-right">{{ row.completed }}</td>
                <td class="px-3 py-2 text-right" :class="metricTextClass(row.failed > 0 ? 'error' : 'ok')">{{ row.failed }}</td>
                <td class="px-3 py-2 text-right">{{ fmtMs(row.p95Ms) }}</td>
                <td class="px-3 py-2 text-xs text-[var(--text-tertiary)]">
                  {{ row.failedSteps.map((step: any) => `${step.step} (${step.count})`).join(', ') || '-' }}
                </td>
                <td class="px-3 py-2 text-xs text-[var(--text-tertiary)]">
                  {{ row.slowSteps.map((step: any) => `${step.step} ${fmtMs(step.p95Ms)}`).join(', ') || '-' }}
                </td>
              </tr>
              <tr v-if="flowRows.length === 0">
                <td colspan="7" class="px-3 py-8 text-center text-[var(--text-tertiary)]">No flow executions recorded yet</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="mt-4 overflow-x-auto rounded-lg border border-[var(--border-default)]">
          <table class="w-full min-w-[860px] text-sm">
            <thead class="border-b border-[var(--border-default)] text-left text-xs text-[var(--text-tertiary)]">
              <tr>
                <th class="px-3 py-2">Failed queue job</th>
                <th class="px-3 py-2">Flow</th>
                <th class="px-3 py-2">Reason</th>
                <th class="px-3 py-2 text-right">Attempts</th>
                <th class="px-3 py-2">Failed at</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[var(--border-default)]">
              <tr v-for="job in flowFailedJobRows" :key="`${job.instanceId}-${job.id}`">
                <td class="px-3 py-2">
                  <div class="font-medium text-[var(--text-primary)]">{{ job.name || '-' }}</div>
                  <div class="text-xs text-[var(--text-tertiary)]">{{ job.instanceId }} · #{{ job.id }}</div>
                </td>
                <td class="px-3 py-2">
                  <div class="font-medium text-[var(--text-primary)]">{{ job.flowName || job.flowId || '-' }}</div>
                  <div v-if="job.flowName && job.flowId" class="text-xs text-[var(--text-tertiary)]">id {{ job.flowId }}</div>
                </td>
                <td class="max-w-[360px] truncate px-3 py-2 text-xs text-[var(--text-tertiary)]" :title="job.failedReason || '-'">
                  {{ job.failedReason || '-' }}
                </td>
                <td class="px-3 py-2 text-right">{{ job.attemptsMade }}</td>
                <td class="px-3 py-2 text-xs text-[var(--text-tertiary)]">{{ fmtDateTime(job.finishedOn ? new Date(job.finishedOn) : job.timestamp ? new Date(job.timestamp) : null) }}</td>
              </tr>
              <tr v-if="flowFailedJobRows.length === 0">
                <td colspan="5" class="px-3 py-8 text-center text-[var(--text-tertiary)]">No retained failed queue jobs</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div v-else-if="activeTab === 'workers'" class="grid gap-4">
        <section v-for="metrics in instances" :key="metrics.instance.id" class="surface-card rounded-lg p-4">
          <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div class="font-medium text-[var(--text-primary)]">{{ metrics.instance.id }}</div>
            <UBadge :color="badgeColor(workerSeverity(metrics))" variant="soft">
              {{ workerSeverity(metrics) === 'error' ? 'Critical' : workerSeverity(metrics) === 'warning' ? 'Attention' : 'Healthy' }}
            </UBadge>
          </div>
          <div v-if="workerWarnings(metrics).length > 0" class="mb-3 rounded-lg border border-warning-400/20 bg-warning-400/5 p-3">
            <div class="flex items-center gap-2 text-sm font-medium text-warning-600 dark:text-warning-400">
              <UIcon name="lucide:triangle-alert" class="h-4 w-4" />
              Worker warnings
            </div>
            <ul class="mt-2 space-y-1 text-sm text-[var(--text-secondary)]">
              <li v-for="warning in workerWarnings(metrics)" :key="warning" class="flex gap-2">
                <span class="text-warning-600 dark:text-warning-400">•</span>
                <span>{{ warning }}</span>
              </li>
            </ul>
          </div>
          <div class="mb-3 rounded-lg border border-[var(--border-default)] p-3">
            <div class="text-xs font-medium text-[var(--text-tertiary)]">Executor</div>
            <div class="mt-2 grid grid-cols-2 gap-2 text-sm">
              <div>Workers</div>
              <div class="text-right font-medium">{{ metrics.executor.pool.workers.length }} / {{ metrics.executor.pool.max }}</div>
              <div>Active now / waiting</div>
              <div class="text-right font-medium" :class="metricTextClass(executorQueueSeverity(metrics))">{{ metrics.executor.pool.activeTasks }} / {{ metrics.executor.pool.waitingTasks }}</div>
              <div>Active avg / waiting avg</div>
              <div class="text-right font-medium">{{ fmtNumber(metrics.averages?.executorActiveTasks ?? metrics.executor.pool.activeTasks, 1) }} / {{ fmtNumber(metrics.averages?.executorWaitingTasks ?? metrics.executor.pool.waitingTasks, 1) }}</div>
              <div>Task p95 / p99</div>
              <div class="text-right font-medium" :class="metricTextClass(taskLatencySeverity(metrics))">{{ fmtMs(metrics.executor.p95TaskMs) }} / {{ fmtMs(metrics.executor.p99TaskMs) }}</div>
              <div>Errors / timeouts</div>
              <div class="text-right font-medium" :class="metricTextClass(taskErrorSeverity(metrics))">{{ metrics.executor.taskErrorTotal }} / {{ metrics.executor.taskTimeoutTotal }}</div>
              <div>Rotations</div>
              <div class="text-right font-medium" :class="metricTextClass(rotationSeverity(metrics))">{{ metrics.executor.rotationsTotal }}</div>
            </div>
          </div>
          <div class="rounded-lg border border-[var(--border-default)]">
            <div class="border-b border-[var(--border-default)] px-3 py-2 text-xs font-medium text-[var(--text-tertiary)]">
              Worker Contexts
            </div>
            <div class="divide-y divide-[var(--border-default)]">
              <div
                v-for="worker in metrics.executor.pool.workers"
                :key="worker.id"
                class="grid gap-2 px-3 py-2 text-xs sm:grid-cols-6"
              >
                <div class="font-medium text-[var(--text-primary)]">#{{ worker.id }}</div>
                <div>active {{ worker.activeTasks }}</div>
                <div>idle {{ worker.contextStats.idle ?? 0 }}</div>
                <div>created {{ worker.contextStats.created ?? 0 }}</div>
                <div>reused {{ worker.contextStats.reused ?? 0 }}</div>
                <div :class="metricTextClass((worker.contextStats.scrubFailed ?? 0) > 0 ? 'error' : 'ok')">scrub failed {{ worker.contextStats.scrubFailed ?? 0 }}</div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div v-else-if="activeTab === 'connections'" class="grid gap-4">
        <section v-for="metrics in instances" :key="metrics.instance.id" class="surface-card rounded-lg p-4">
          <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div class="font-medium text-[var(--text-primary)]">{{ metrics.instance.id }}</div>
            <UBadge :color="badgeColor(connectionSeverity(metrics))" variant="soft">
              {{ connectionSeverity(metrics) === 'error' ? 'Critical' : connectionSeverity(metrics) === 'warning' ? 'Attention' : 'Healthy' }}
            </UBadge>
          </div>
          <div v-if="connectionWarnings(metrics).length > 0" class="mb-3 rounded-lg border border-warning-400/20 bg-warning-400/5 p-3">
            <div class="flex items-center gap-2 text-sm font-medium text-warning-600 dark:text-warning-400">
              <UIcon name="lucide:triangle-alert" class="h-4 w-4" />
              Connection warnings
            </div>
            <ul class="mt-2 space-y-1 text-sm text-[var(--text-secondary)]">
              <li v-for="warning in connectionWarnings(metrics)" :key="warning" class="flex gap-2">
                <span class="text-warning-600 dark:text-warning-400">•</span>
                <span>{{ warning }}</span>
              </li>
            </ul>
          </div>
          <div class="grid gap-3 sm:grid-cols-2">
            <div class="rounded-lg border border-[var(--border-default)] p-3">
              <div class="text-xs font-medium text-[var(--text-tertiary)]">WebSocket</div>
              <div class="mt-2 space-y-2 text-sm">
                <div v-for="row in websocketRows(metrics)" :key="row.path" class="flex items-center justify-between gap-3">
                  <span class="truncate">{{ row.path }}</span>
                  <span class="font-medium">{{ row.connected }} connected · {{ row.users }} users</span>
                </div>
                <div v-if="websocketRows(metrics).length === 0" class="text-[var(--text-tertiary)]">
                  No namespaces
                </div>
              </div>
            </div>

            <div class="rounded-lg border border-[var(--border-default)] p-3">
              <div class="text-xs font-medium text-[var(--text-tertiary)]">Queues</div>
              <div class="mt-2 space-y-2 text-sm">
                <div v-for="[name, queue] in connectionQueueEntries(metrics)" :key="name" class="flex items-center justify-between gap-3">
                  <span class="truncate">{{ name }}</span>
                  <span class="font-medium" :class="metricTextClass(queueSeverity(queue))">{{ queueTotal(queue) }}</span>
                </div>
              </div>
            </div>

            <div class="rounded-lg border border-[var(--border-default)] p-3 sm:col-span-2">
              <div class="text-xs font-medium text-[var(--text-tertiary)]">DB Pool</div>
              <div class="mt-2 space-y-2 text-sm">
                <div v-for="row in dbPoolRows(metrics)" :key="row.name" class="flex items-center justify-between gap-3">
                  <span class="truncate">{{ row.name }}</span>
                  <span
                    class="font-medium"
                    :class="metricTextClass((row.pending ?? 0) >= 100 ? 'error' : (row.pending ?? 0) > 0 ? 'warning' : 'ok')"
                  >
                    {{ row.used ?? 0 }} used · {{ row.free ?? 0 }} free · {{ row.pending ?? 0 }} pending
                  </span>
                </div>
                <div v-if="dbPoolRows(metrics).length === 0" class="text-[var(--text-tertiary)]">
                  {{ metrics.db?.type ?? 'unknown' }}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section class="surface-card overflow-hidden rounded-2xl">
        <div class="relative px-6 py-8 sm:px-8">
          <div class="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-default)] pb-3">
            <div>
              <div class="font-medium text-[var(--text-primary)]">{{ activeGuide.title }}</div>
              <div class="mt-1 text-xs text-[var(--text-tertiary)]">
                {{ activeGuide.description }}
              </div>
            </div>
          </div>

          <div class="mt-4 grid gap-3 xl:grid-cols-2">
            <div v-for="group in activeGuide.groups" :key="group.title" class="rounded-lg border border-[var(--border-default)] p-3">
              <div class="text-xs font-medium text-[var(--text-tertiary)]">{{ group.title }}</div>
              <div class="mt-3 divide-y divide-[var(--border-default)]">
                <div v-for="[name, description] in group.items" :key="name" class="grid gap-1 py-2 text-sm sm:grid-cols-[150px_1fr]">
                  <div class="font-medium text-[var(--text-primary)]">{{ name }}</div>
                  <div class="text-[var(--text-tertiary)]">{{ description }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </template>
  </div>

  <div v-else class="flex items-center justify-center py-12">
    <CommonEmptyState
      title="Access denied"
      description="You do not have permission to view runtime metrics."
      icon="lucide:lock"
      size="md"
    />
  </div>
</template>
