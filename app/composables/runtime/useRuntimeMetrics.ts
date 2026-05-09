import {
  redisAdminKeyChange,
  redisAdminOverview,
  redisAdminOverviewUpdatedAt,
  runtimeMetricsByInstance,
  runtimeMetricsUpdatedAt,
} from '~/composables/shared/useAdminSocket';
import type {
  RedisAdminKeyDetail,
  RedisAdminKeySummary,
  RedisAdminSetKeyInput,
  RuntimeAppMetricInstance,
  RuntimeAppTelemetryCluster,
  RuntimeClusterStats,
  RuntimeGuide,
  RuntimeSeverity,
} from '~/types/runtime-monitor';
import { runtimeTabGuides } from '~/utils/runtime-monitor/guides';
import { maxSeverity } from '~/utils/runtime-monitor/core';
import { getRuntimeCacheReloadRows } from '~/utils/runtime-monitor/cache';
import {
  getRuntimeDatabaseRows,
  getRuntimeFlowFailedJobRows,
  getRuntimeFlowRows,
  getRuntimeRequestRows,
} from '~/utils/runtime-monitor/rows';
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
  { label: 'Redis', icon: 'i-lucide-hard-drive', value: 'redis' },
  { label: 'Database', icon: 'i-lucide-database', value: 'database' },
  { label: 'Flows', icon: 'i-lucide-git-branch', value: 'flows' },
  { label: 'Workers', icon: 'i-lucide-cpu', value: 'workers' },
  { label: 'Connections', icon: 'i-lucide-network', value: 'connections' },
];

export function useRuntimeMetrics() {
  const route = useRoute();
  const adminSocket = useAdminSocket();
  const redisSetApi = useApi<{ success: boolean; data: RedisAdminKeyDetail }>(
    '/admin/redis/key',
    { method: 'post', disableErrorPage: true },
  );
  const redisDeleteApi = useApi<{ success: boolean; data: { deleted: number } }>(
    '/admin/redis/key',
    { method: 'delete', disableErrorPage: true },
  );
  const redisTtlApi = useApi<{ success: boolean; data: RedisAdminKeySummary }>(
    '/admin/redis/key/ttl',
    { method: 'patch', disableErrorPage: true },
  );
  const activeTab = ref((route.query.tab as string) || 'overview');
  const nowMs = ref(Date.now());
  let clockTimer: ReturnType<typeof setInterval> | null = null;
  if (!BASE_TAB_ITEMS.some((tab) => tab.value === activeTab.value)) {
    activeTab.value = 'overview';
  }

  onMounted(() => {
    clockTimer = setInterval(() => {
      nowMs.value = Date.now();
    }, 250);
  });

  onUnmounted(() => {
    if (clockTimer) {
      clearInterval(clockTimer);
      clockTimer = null;
    }
  });

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
    const seconds = Math.max(0, Math.round((nowMs.value - runtimeMetricsUpdatedAt.value) / 1000));
    return seconds === 0 ? 'Live' : `${seconds}s ago`;
  });

  const lastUpdatedAgeSec = computed(() => {
    if (!runtimeMetricsUpdatedAt.value) return Infinity;
    return Math.max(0, Math.round((nowMs.value - runtimeMetricsUpdatedAt.value) / 1000));
  });

  const sampleIntervalMs = computed(() => {
    const intervals = instances.value
      .map((item) => item.intervalMs)
      .filter((value) => Number.isFinite(value) && value > 0);
    return intervals.length > 0 ? Math.max(...intervals) : 2000;
  });

  const nextUpdateMs = computed(() => {
    if (!runtimeMetricsUpdatedAt.value) return sampleIntervalMs.value;
    const elapsed = nowMs.value - runtimeMetricsUpdatedAt.value;
    return Math.max(0, sampleIntervalMs.value - elapsed);
  });

  const nextUpdateLabel = computed(() => {
    if (!runtimeMetricsUpdatedAt.value) return 'waiting';
    if (nextUpdateMs.value <= 0) return 'any moment';
    return `${(nextUpdateMs.value / 1000).toFixed(1)}s`;
  });

  const nextUpdateProgress = computed(() => {
    const interval = sampleIntervalMs.value;
    if (!runtimeMetricsUpdatedAt.value || interval <= 0) return 0;
    return Math.min(1, Math.max(0, 1 - nextUpdateMs.value / interval));
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
      .filter((cluster): cluster is RuntimeClusterStats => Boolean(cluster))
      .sort((a, b) => {
        const at = Date.parse(a.lastReconciledAt ?? '') || 0;
        const bt = Date.parse(b.lastReconciledAt ?? '') || 0;
        return bt - at;
      });
    return rows[0] ?? null;
  });

  const latestAppCluster = computed(() => {
    return instances.value
      .map((metrics) => metrics.appCluster)
      .filter(
        (cluster): cluster is RuntimeAppTelemetryCluster =>
          Boolean(cluster?.instances?.length),
      )
      .sort((a, b) => {
        const latestA = Math.max(...a.instances.map((item) => Date.parse(item.sampledAt) || 0));
        const latestB = Math.max(...b.instances.map((item) => Date.parse(item.sampledAt) || 0));
        return latestB - latestA;
      })[0] ?? null;
  });

  const appMetricInstances = computed<RuntimeAppMetricInstance[]>(() => {
    const latest = latestAppCluster.value;
    if (latest?.instances?.length) {
      return latest.instances.map((item) => ({
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

  const appClusterStats = computed(() => {
    const staleAfterMs = latestAppCluster.value?.ttlMs ?? sampleIntervalMs.value * 5;
    return {
      enabled: appMetricInstances.value.length > 0,
      activeCount: appMetricInstances.value.length,
      staleAfterMs,
      sampleIntervalMs: sampleIntervalMs.value,
      instances: appMetricInstances.value.map((item) => {
        const sampledAtMs = Date.parse(item.sampledAt);
        return {
          id: item.instanceId,
          lastSeenAt: item.sampledAt,
          ageMs: Number.isFinite(sampledAtMs)
            ? Math.max(0, nowMs.value - sampledAtMs)
            : staleAfterMs,
        };
      }),
    };
  });

  const requestRows = computed(() => {
    return getRuntimeRequestRows(appMetricInstances.value);
  });

  const cacheReloadRows = computed(() => {
    return getRuntimeCacheReloadRows(appMetricInstances.value);
  });

  const databaseRows = computed(() => {
    return getRuntimeDatabaseRows(appMetricInstances.value);
  });

  const flowRows = computed(() => {
    return getRuntimeFlowRows(appMetricInstances.value);
  });

  const flowFailedJobRows = computed(() =>
    getRuntimeFlowFailedJobRows(instances.value),
  );
  const redisKeys = ref<RedisAdminKeySummary[]>([]);
  const redisKeysCursor = ref('0');
  const redisKeysPattern = ref('*');
  const redisKeysPending = ref(false);
  const redisDetailPending = ref(false);
  const redisWritePending = ref(false);
  const redisSelectedKey = ref<string | null>(null);
  const redisSelectedDetail = ref<RedisAdminKeyDetail | null>(null);
  const redisError = ref<string | null>(null);

  function errorMessage(error: unknown) {
    return error instanceof Error ? error.message : String(error || 'Request failed');
  }

  async function refreshRedisOverview() {
    try {
      redisError.value = null;
      return await adminSocket.loadRedisOverview();
    } catch (error) {
      redisError.value = errorMessage(error);
      return null;
    }
  }

  async function scanRedisKeys(options: { reset?: boolean } = {}) {
    redisKeysPending.value = true;
    try {
      redisError.value = null;
      const reset = options.reset !== false;
      const result = await adminSocket.loadRedisKeys({
        cursor: reset ? '0' : redisKeysCursor.value,
        pattern: redisKeysPattern.value || '*',
        count: 10,
      });
      redisKeysCursor.value = result.cursor;
      if (reset) {
        redisKeys.value = result.keys;
      } else {
        const byKey = new Map(redisKeys.value.map((item) => [item.key, item]));
        for (const key of result.keys) byKey.set(key.key, key);
        redisKeys.value = [...byKey.values()];
      }
      return result;
    } catch (error) {
      redisError.value = errorMessage(error);
      return null;
    } finally {
      redisKeysPending.value = false;
    }
  }

  async function selectRedisKey(key: string) {
    redisSelectedKey.value = key;
    redisDetailPending.value = true;
    try {
      redisError.value = null;
      redisSelectedDetail.value = await adminSocket.loadRedisKey({ key, limit: 100 });
      return redisSelectedDetail.value;
    } catch (error) {
      redisError.value = errorMessage(error);
      return null;
    } finally {
      redisDetailPending.value = false;
    }
  }

  async function refreshRedisAfterWrite(key?: string | null, deleted = false) {
    await Promise.all([
      refreshRedisOverview(),
      scanRedisKeys({ reset: true }),
    ]);
    if (!key) return;
    if (deleted) {
      if (redisSelectedKey.value === key) {
        redisSelectedKey.value = null;
        redisSelectedDetail.value = null;
      }
      return;
    }
    await selectRedisKey(key);
  }

  async function saveRedisKey(input: RedisAdminSetKeyInput) {
    redisWritePending.value = true;
    try {
      const response = await redisSetApi.execute({ body: input }) as
        | { success: boolean; data: RedisAdminKeyDetail }
        | null;
      if (response?.data) redisSelectedDetail.value = response.data;
      await refreshRedisAfterWrite(input.key);
      return response?.data ?? null;
    } finally {
      redisWritePending.value = false;
    }
  }

  async function deleteRedisKey(key: string) {
    redisWritePending.value = true;
    try {
      const response = await redisDeleteApi.execute({ query: { key } }) as
        | { success: boolean; data: { deleted: number } }
        | null;
      await refreshRedisAfterWrite(key, true);
      return response?.data ?? null;
    } finally {
      redisWritePending.value = false;
    }
  }

  async function updateRedisKeyTtl(key: string, ttlSeconds: number | null) {
    redisWritePending.value = true;
    try {
      const response = await redisTtlApi.execute({ body: { key, ttlSeconds } }) as
        | { success: boolean; data: RedisAdminKeySummary }
        | null;
      await refreshRedisAfterWrite(key);
      return response?.data ?? null;
    } finally {
      redisWritePending.value = false;
    }
  }

  function clearRedisSelection() {
    redisSelectedKey.value = null;
    redisSelectedDetail.value = null;
  }

  watch(activeTab, (tab) => {
    if (tab === 'redis' && !redisAdminOverview.value) {
      void refreshRedisOverview();
      void scanRedisKeys({ reset: true });
    }
  }, { immediate: true });

  watch(redisAdminKeyChange, (change) => {
    if (!change || activeTab.value !== 'redis') return;
    if (change.operation === 'delete' && change.key === redisSelectedKey.value) {
      redisSelectedKey.value = null;
      redisSelectedDetail.value = null;
    } else if (change.detail && change.key === redisSelectedKey.value) {
      redisSelectedDetail.value = change.detail;
    }
    void scanRedisKeys({ reset: true });
  });

  function updatedSeverity(): RuntimeSeverity {
    if (lastUpdatedAgeSec.value > 20) return 'error';
    if (lastUpdatedAgeSec.value > 6) return 'warning';
    return 'ok';
  }

  function clusterSeverity(): RuntimeSeverity {
    const cluster = appClusterStats.value;
    if (!cluster.enabled) return 'ok';
    if (cluster.instances.some((item) => item.ageMs > cluster.staleAfterMs * 0.75)) {
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

  function redisTabSeverity(): RuntimeSeverity {
    const overview = redisAdminOverview.value;
    if (!overview) return redisError.value ? 'warning' : 'ok';
    return overview.health?.severity ?? 'ok';
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
        return maxSeverity(clusterSeverity(), ...instances.value.map((metrics) => metrics.health?.overview?.severity ?? overviewSeverity(metrics)));
      case 'requests':
        return requestTabSeverity();
      case 'cache':
        return cacheTabSeverity();
      case 'redis':
        return redisTabSeverity();
      case 'database':
        return maxSeverity(...instances.value.map((metrics) => metrics.health?.database?.severity ?? databaseSeverity(metrics)), databaseQuerySeverity());
      case 'flows':
        return maxSeverity(...instances.value.map((metrics) => metrics.health?.flows?.severity ?? flowSeverity(metrics)));
      case 'workers':
        return maxSeverity(...instances.value.map((metrics) => metrics.health?.workers?.severity ?? workerSeverity(metrics)));
      case 'connections':
        return maxSeverity(...instances.value.map((metrics) => metrics.health?.connections?.severity ?? connectionSeverity(metrics)));
      default:
        return 'ok';
    }
  }

  function tabIssueCount(tab: string) {
    switch (tab) {
      case 'overview':
        return (clusterSeverity() === 'ok' ? 0 : 1) + instances.value.reduce((sum, metrics) => sum + (metrics.health?.overview?.messages ?? overviewWarnings(metrics)).length, 0);
      case 'requests':
        return requestRows.value.filter((row) => row.status5xx > 0 || row.status4xx > 0 || row.p95Ms >= 1000 || row.p99Ms >= 1000).length;
      case 'cache':
        return cacheReloadRows.value.filter((row) => row.status === 'failed').length;
      case 'redis':
        return redisAdminOverview.value?.health?.warnings?.length
          || (redisTabSeverity() === 'ok' ? 0 : 1);
      case 'database':
        return databaseRows.value.filter((row) => row.poolAcquireTimeouts > 0 || row.errors > 0 || row.slow > 0 || row.p95Ms >= 500).length + instances.value.reduce((sum, metrics) => sum + (metrics.health?.database?.messages ?? databaseWarnings(metrics)).length, 0);
      case 'flows':
        return instances.value.reduce((sum, metrics) => sum + (metrics.health?.flows?.messages ?? flowWarnings(metrics)).length, 0);
      case 'workers':
        return instances.value.reduce((sum, metrics) => sum + (metrics.health?.workers?.messages ?? workerWarnings(metrics)).length, 0);
      case 'connections':
        return instances.value.reduce((sum, metrics) => sum + (metrics.health?.connections?.messages ?? connectionWarnings(metrics)).length, 0);
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
    sampleIntervalMs,
    nextUpdateMs,
    nextUpdateLabel,
    nextUpdateProgress,
    latestSampledAt,
    appClusterStats,
    clusterStats,
    requestRows,
    cacheReloadRows,
    databaseRows,
    flowRows,
    flowFailedJobRows,
    redisOverview: redisAdminOverview,
    redisOverviewUpdatedAt: redisAdminOverviewUpdatedAt,
    redisKeys,
    redisKeysCursor,
    redisKeysPattern,
    redisKeysPending,
    redisDetailPending,
    redisWritePending,
    redisSelectedKey,
    redisSelectedDetail,
    redisError,
    refreshRedisOverview,
    scanRedisKeys,
    selectRedisKey,
    saveRedisKey,
    deleteRedisKey,
    updateRedisKeyTtl,
    clearRedisSelection,
    activeGuide,
    updatedSeverity,
    clusterSeverity,
    tabSeverity,
  });
}
