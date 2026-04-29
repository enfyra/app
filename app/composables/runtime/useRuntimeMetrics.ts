import {
  runtimeMetricsByInstance,
  runtimeMetricsUpdatedAt,
} from '~/composables/shared/useAdminSocket';
import type {
  RuntimeAppMetrics,
  RuntimeGuide,
  RuntimeMetricsPayload,
  RuntimeSeverity,
} from '~/types/runtime-monitor';
import { runtimeTabGuides } from '~/utils/runtime-monitor/guides';
import { maxSeverity } from '~/utils/runtime-monitor/core';
import { getRuntimeCacheReloadRows } from '~/utils/runtime-monitor/cache';
import {
  databaseSeverity,
  flowSeverity,
  overviewSeverity,
  workerSeverity,
  connectionSeverity,
} from '~/utils/runtime-monitor/severity';
import {
  overviewWarnings,
  workerWarnings,
  flowWarnings,
  databaseWarnings,
  connectionWarnings,
} from '~/utils/runtime-monitor/warnings';

const BASE_TAB_ITEMS = [
  { label: 'Overview', icon: 'i-lucide-layout-dashboard', value: 'overview' },
  { label: 'Requests', icon: 'i-lucide-radio-tower', value: 'requests' },
  { label: 'Cache', icon: 'i-lucide-refresh-cw', value: 'cache' },
  { label: 'Database', icon: 'i-lucide-database', value: 'database' },
  { label: 'Flows', icon: 'i-lucide-git-branch', value: 'flows' },
  { label: 'Workers', icon: 'i-lucide-cpu', value: 'workers' },
  { label: 'Connections', icon: 'i-lucide-network', value: 'connections' },
];

export function useRuntimeMetrics() {
  const route = useRoute();
  const activeTab = ref((route.query.tab as string) || 'overview');
  if (!BASE_TAB_ITEMS.some((tab) => tab.value === activeTab.value)) {
    activeTab.value = 'overview';
  }

  watch(activeTab, (tab) => {
    navigateTo({ query: { ...route.query, tab } }, { replace: true });
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
    const seconds = Math.max(0, Math.round((Date.now() - runtimeMetricsUpdatedAt.value) / 1000));
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

  const appMetricInstances = computed(() => {
    const latest = instances.value
      .map((metrics) => metrics.appCluster)
      .filter((cluster) => cluster?.instances?.length)
      .sort((a: any, b: any) => {
        const latestA = Math.max(...a.instances.map((item: any) => Date.parse(item.sampledAt) || 0));
        const latestB = Math.max(...b.instances.map((item: any) => Date.parse(item.sampledAt) || 0));
        return latestB - latestA;
      })[0];

    if (latest?.instances?.length) {
      return latest.instances.map((item: any) => ({
        instanceId: item.instanceId,
        sampledAt: item.sampledAt,
        app: item.app,
      }));
    }

    return instances.value.map((metrics) => ({
      instanceId: metrics.instance.id,
      sampledAt: metrics.sampledAt,
      app: metrics.app,
    }));
  });

  const requestRows = computed(() => {
    const map = new Map<string, any>();
    for (const metrics of appMetricInstances.value) {
      for (const row of metrics.app?.requests.routes ?? []) {
        const key = `${row.method}:${row.route}`;
        const current = map.get(key) ?? {
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

  const cacheReloadRows = computed(() => {
    return getRuntimeCacheReloadRows(appMetricInstances.value);
  });

  const databaseRows = computed(() => {
    const map = new Map<string, any>();
    for (const metrics of appMetricInstances.value) {
      for (const row of metrics.app?.database.queries ?? []) {
        const key = `${row.context ?? 'runtime'}:${row.op}:${row.table}`;
        const current = map.get(key) ?? {
          context: row.context ?? 'runtime',
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
    for (const metrics of appMetricInstances.value) {
      for (const row of metrics.app?.flows.rows ?? []) {
        const key = String(row.flowId);
        const current = map.get(key) ?? {
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
    return [...map.values()]
      .map((row) => ({
        ...row,
        failedSteps: [...row.failedSteps.entries()].map(([step, count]) => ({ step, count })).sort((a, b) => b.count - a.count).slice(0, 3),
        slowSteps: [...row.slowSteps.entries()].map(([step, p95Ms]) => ({ step, p95Ms })).sort((a, b) => b.p95Ms - a.p95Ms).slice(0, 3),
      }))
      .sort((a, b) => b.running - a.running || b.failed - a.failed || b.p95Ms - a.p95Ms)
      .slice(0, 20);
  });

  const flowFailedJobRows = computed(() =>
    instances.value
      .flatMap((metrics) =>
        (metrics.queues.flow?.failedJobs ?? []).map((job) => ({
          ...job,
          instanceId: metrics.instance.id,
        })),
      )
      .sort((a, b) => (b.finishedOn ?? b.timestamp ?? 0) - (a.finishedOn ?? a.timestamp ?? 0))
      .slice(0, 30),
  );

  function updatedSeverity(): RuntimeSeverity {
    if (lastUpdatedAgeSec.value > 20) return 'error';
    if (lastUpdatedAgeSec.value > 6) return 'warning';
    return 'ok';
  }

  function clusterSeverity(): RuntimeSeverity {
    const cluster = clusterStats.value;
    if (!cluster?.enabled) return 'ok';
    if (cluster.instances.some((item: any) => item.ageMs > cluster.staleAfterMs * 0.75)) {
      return 'warning';
    }
    return 'ok';
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

  function cacheTabSeverity(): RuntimeSeverity {
    return cacheReloadRows.value.some((row) => row.status === 'failed') ? 'error' : 'ok';
  }

  function databaseQuerySeverity(): RuntimeSeverity {
    return maxSeverity(
      ...databaseRows.value.map((row) =>
        row.poolAcquireTimeouts > 0 || row.errors > 0
          ? 'error'
          : row.slow > 0 || row.p95Ms >= 500
            ? 'warning'
            : 'ok',
      ),
    );
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
        return maxSeverity(...instances.value.map(databaseSeverity), databaseQuerySeverity());
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
        return (clusterSeverity() === 'ok' ? 0 : 1) + instances.value.reduce((sum, metrics) => sum + overviewWarnings(metrics).length, 0);
      case 'requests':
        return requestRows.value.filter((row) => row.status5xx > 0 || row.status4xx > 0 || row.p95Ms >= 1000 || row.p99Ms >= 1000).length;
      case 'cache':
        return cacheReloadRows.value.filter((row) => row.status === 'failed').length;
      case 'database':
        return databaseRows.value.filter((row) => row.poolAcquireTimeouts > 0 || row.errors > 0 || row.slow > 0 || row.p95Ms >= 500).length + instances.value.reduce((sum, metrics) => sum + databaseWarnings(metrics).length, 0);
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
    BASE_TAB_ITEMS.map((item) => {
      const count = tabIssueCount(item.value);
      return {
        ...item,
        label: count > 0 ? `${item.label} (${count})` : item.label,
      };
    }),
  );

  const activeGuide = computed<RuntimeGuide>(() => runtimeTabGuides[activeTab.value] ?? runtimeTabGuides.overview!);

  return reactive({
    activeTab,
    tabItems,
    instances,
    totals,
    lastUpdatedLabel,
    latestSampledAt,
    clusterStats,
    requestRows,
    cacheReloadRows,
    databaseRows,
    flowRows,
    flowFailedJobRows,
    activeGuide,
    updatedSeverity,
    clusterSeverity,
    tabSeverity,
  });
}
