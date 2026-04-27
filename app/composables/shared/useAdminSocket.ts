import { io, type Socket } from 'socket.io-client';

import { ENFYRA_SOCKET_AUTH_ERROR } from '~/constants/enfyra';

type ReloadPayload = {
  flow: string;
  status: 'pending' | 'done';
  steps?: string[];
};

type ActiveReload = {
  flow: string;
  steps: string[];
  startedAt: number;
};

export type RuntimeMetricsPayload = {
  sampledAt: string;
  intervalMs: number;
  averages?: {
    onlineMs: number;
    samples: number;
    rssMb: number;
    heapUsedMb: number;
    heapTotalMb: number;
    externalMb: number;
    eventLoopLagMs: number;
    cpuRatio: number;
    executorActiveTasks: number;
    executorWaitingTasks: number;
    executorP95TaskMs: number;
    executorP99TaskMs: number;
    executorMaxHeapRatio: number;
    websocketConnections: number;
    queueDepth: number;
    queueFailed: number;
    dbUsed: number;
    dbFree: number;
    dbPending: number;
  };
  hardware?: {
    effectiveMemoryMb: number;
    hostMemoryMb: number;
    effectiveCpuCount: number;
    hostCpuCount: number;
    constrained: boolean;
  };
  instance: {
    id: string;
    pid: number;
    uptimeSec: number;
    rssMb: number;
    heapUsedMb: number;
    heapTotalMb: number;
    heapLimitMb?: number;
    externalMb: number;
    eventLoopLagMs: number;
    cpuRatio: number;
  };
  executor: {
    tuning: {
      maxConcurrentWorkers: number;
      isolateMemoryLimitMb: number;
      tasksPerWorkerCap: number;
      isolatePoolSize: number;
    };
    pool: {
      max: number;
      activeTasks: number;
      waitingTasks: number;
      workers: Array<{
        id: number;
        activeTasks: number;
        draining: boolean;
        ageMs: number;
        lastHeapRatio: number;
        contextStats: Record<string, number>;
      }>;
    };
    taskDoneTotal: number;
    taskErrorTotal: number;
    taskTimeoutTotal: number;
    rotationsTotal: number;
    crashesTotal: number;
    avgTaskMs: number;
    p95TaskMs: number;
    p99TaskMs: number;
    maxHeapRatio: number;
  };
  queues: Record<string, {
    waiting: number;
    active: number;
    delayed: number;
    failed: number;
    failedJobs?: Array<{
      id: string;
      name: string;
      flowId?: string | number;
      flowName?: string;
      failedReason?: string;
      attemptsMade: number;
      timestamp?: number;
      finishedOn?: number;
    }>;
  } | null>;
  websocket?: {
    total: number;
    namespaces: Array<{
      path: string;
      connected: number;
      users: number;
    }>;
  };
  db: any;
  cluster?: {
    enabled: boolean;
    key: string;
    instanceId: string;
    activeCount: number;
    staleAfterMs: number;
    heartbeatIntervalMs: number;
    reconcileIntervalMs: number;
    instances: Array<{
      id: string;
      lastSeenAt: string;
      ageMs: number;
    }>;
    serverMaxConnections: number | null;
    reserveConnections: number | null;
    targetPoolMax: number | null;
    lastReconciledAt: string | null;
  } | null;
  app?: {
    requests: {
      total: number;
      rps: number;
      routes: Array<{
        method: string;
        route: string;
        count: number;
        rps: number;
        avgMs: number;
        p50Ms: number;
        p95Ms: number;
        p99Ms: number;
        status2xx: number;
        status3xx: number;
        status4xx: number;
        status5xx: number;
      }>;
    };
    cache: {
      recent: Array<{
        flow: string;
        table: string;
        scope?: string;
        status: 'success' | 'failed';
        durationMs: number;
        startedAt: string;
        completedAt: string;
        error?: string;
        steps: Array<{
          name: string;
          durationMs: number;
          status: 'success' | 'failed';
          error?: string;
        }>;
      }>;
    };
    database: {
      slowQueryThresholdMs: number;
      totalErrors: number;
      totalPoolAcquireTimeouts: number;
      totalSlow: number;
      queries: Array<{
        op: string;
        table: string;
        count: number;
        errors: number;
        poolAcquireTimeouts: number;
        slow: number;
        avgMs: number;
        p95Ms: number;
        p99Ms: number;
      }>;
    };
    flows: {
      running: number;
      completed: number;
      failed: number;
      rows: Array<{
        flowId: string | number;
        flowName: string;
        running: number;
        completed: number;
        failed: number;
        avgMs: number;
        p95Ms: number;
        failedSteps: Array<{ step: string; count: number }>;
        slowSteps: Array<{ step: string; p95Ms: number }>;
      }>;
    };
  };
};

const FLOW_LABELS: Record<string, string> = {
  metadata: 'Schema metadata',
  route: 'Routes',
  graphql: 'GraphQL',
  guard: 'Guards',
  fieldPermission: 'Field permissions',
  setting: 'Settings',
  storage: 'Storage',
  oauth: 'OAuth',
  websocket: 'WebSockets',
  package: 'Packages',
  flow: 'Flows',
  folder: 'Folders',
  bootstrap: 'Bootstrap scripts',
  all: 'All caches',
};

export function flowLabel(flow: string): string {
  return FLOW_LABELS[flow] ?? flow;
}

let socket: Socket | null = null;

export const activeReloads = ref<ActiveReload[]>([]);
export const reloadDoneCountdown = ref(0);
export const runtimeMetricsByInstance = ref<Record<string, RuntimeMetricsPayload>>({});
export const runtimeMetricsUpdatedAt = ref<number | null>(null);

const isReloadingRef = computed(() => activeReloads.value.length > 0);
const showReloadBannerRef = computed(
  () => activeReloads.value.length > 0 || reloadDoneCountdown.value > 0,
);
const reloadLabelsRef = computed(() =>
  activeReloads.value.map((r) => flowLabel(r.flow)),
);

export const isReloading = isReloadingRef;
export const showReloadBanner = showReloadBannerRef;
export const reloadLabels = reloadLabelsRef;

let reloadDoneTimer: ReturnType<typeof setTimeout> | null = null;
let countdownInterval: ReturnType<typeof setInterval> | null = null;

function clearReloadTimers() {
  if (reloadDoneTimer) {
    clearTimeout(reloadDoneTimer);
    reloadDoneTimer = null;
  }
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
}

export function dismissReloadBanner() {
  activeReloads.value = [];
  reloadDoneCountdown.value = 0;
  clearReloadTimers();
}

function startDoneCountdown() {
  clearReloadTimers();
  reloadDoneCountdown.value = 5;
  countdownInterval = setInterval(() => {
    reloadDoneCountdown.value--;
    if (reloadDoneCountdown.value <= 0) {
      if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
      }
    }
  }, 1000);
  reloadDoneTimer = setTimeout(() => {
    reloadDoneCountdown.value = 0;
    reloadDoneTimer = null;
  }, 5000);
}

export function useAdminSocket() {
  const notify = useNotify();
  const schema = useSchema();
  const routes = useRoutes();
  const menuRegistry = useMenuRegistry();

  if (!socket) {
    socket = io('/ws/enfyra-admin', {
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 30_000,
    });

    const shouldToastConnection = () => {
      if (typeof document === 'undefined') return true;
      if (document.visibilityState !== 'visible') return false;
      if (typeof document.hasFocus === 'function' && !document.hasFocus()) return false;
      return true;
    };

    socket.on('connect', () => {
      console.log('Connected to admin socket');
    });

    socket.on('connect_error', (err: Error) => {
      if (err?.message === ENFYRA_SOCKET_AUTH_ERROR) return;
      if (!shouldToastConnection()) return;
      console.error('Connection error:', err);
    });

    socket.on('disconnect', (_reason: string) => {
      if (!shouldToastConnection()) return;
    });

    socket.io.on('reconnect', () => {
      if (!shouldToastConnection()) return;
    });

    socket.io.on('reconnect_failed', () => {
      if (!shouldToastConnection()) return;
    });

    socket.on('$system:reload', async (data: ReloadPayload) => {
      const flow = data?.flow;
      if (!flow) return;

      if (data.status === 'pending') {
        reloadDoneCountdown.value = 0;
        clearReloadTimers();
        if (!activeReloads.value.some((r) => r.flow === flow)) {
          activeReloads.value = [
            ...activeReloads.value,
            { flow, steps: data.steps ?? [flow], startedAt: Date.now() },
          ];
        }
        return;
      }

      if (data.status === 'done') {
        const entry = activeReloads.value.find((r) => r.flow === flow);
        const steps = entry?.steps ?? data.steps ?? [flow];

        const needsSchema = steps.includes('metadata') || steps.includes('graphql');
        const needsRoutes = steps.includes('metadata') || steps.includes('route');
        const needsMenus = steps.includes('metadata');

        if (needsSchema) await schema.forceRefreshSchema();
        if (needsRoutes) await routes.loadRoutes();
        if (needsMenus) {
          await menuRegistry.registerDataMenuItems(
            Object.values(schema.schemas.value),
          );
        }

        activeReloads.value = activeReloads.value.filter((r) => r.flow !== flow);

        if (activeReloads.value.length === 0) {
          startDoneCountdown();
        }
      }
    });

    socket.on('$system:runtime:metrics', (data: RuntimeMetricsPayload) => {
      const id = data?.instance?.id;
      if (!id) return;
      runtimeMetricsByInstance.value = {
        ...runtimeMetricsByInstance.value,
        [id]: data,
      };
      runtimeMetricsUpdatedAt.value = Date.now();
    });

    socket.on('$system:package:installed', (data: any) => {
      notify.success('Package ready', `${data.name}@${data.version} installed successfully`);
    });

    socket.on('$system:package:uninstalled', (data: any) => {
      notify.success('Package removed', `${data.name} has been uninstalled`);
    });

    socket.on('$system:package:failed', (data: any) => {
      notify.error('Package operation failed', data.error || `Failed to ${data.operation} ${data.name}`);
    });
  }

  return {
    adminSocket: socket,
    activeReloads,
    isReloading,
    showReloadBanner,
    runtimeMetricsByInstance,
    runtimeMetricsUpdatedAt,
  };
}
