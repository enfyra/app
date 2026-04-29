export type RuntimeSeverity = 'ok' | 'warning' | 'error';

export type RedisAdminValueType =
  | 'string'
  | 'hash'
  | 'list'
  | 'set'
  | 'zset'
  | 'stream'
  | 'none'
  | 'unknown';

export type RedisAdminSystemMark = {
  isSystem: boolean;
  modifiable: boolean;
  systemKind?: RedisAdminSystemKind;
  reason?: string;
};

export type RedisAdminSystemKind =
  | 'runtime_cache'
  | 'user_cache'
  | 'bullmq'
  | 'socket_io'
  | 'runtime_monitor'
  | 'sql_pool_coordination'
  | 'system_lock';

export type RedisAdminNamespaceScope = 'current' | 'global';

export type RedisAdminKeySummary = RedisAdminSystemMark & {
  key: string;
  namespace?: string;
  namespaceScope: RedisAdminNamespaceScope;
  type: RedisAdminValueType;
  ttlSeconds: number;
  size?: number;
  memoryBytes?: number | null;
};

export type RedisAdminOverview = {
  connected: boolean;
  keyCount: number;
  scanned: number;
  scanComplete: boolean;
  server: {
    redisVersion?: string;
    mode?: string;
    role?: string;
    os?: string;
    archBits?: number;
    processId?: number;
    tcpPort?: number;
    configuredHz?: number;
    uptimeSeconds?: number;
    usedMemoryHuman?: string;
    usedMemoryBytes?: number;
    maxMemoryHuman?: string;
    maxMemoryBytes?: number;
    totalSystemMemoryHuman?: string;
    totalSystemMemoryBytes?: number;
    allocator?: string;
    memFragmentationRatio?: number;
    connectedClients?: number;
    usedCpuSys?: number;
    usedCpuUser?: number;
    usedCpuSysChildren?: number;
    usedCpuUserChildren?: number;
  };
  keyspace: Record<string, string>;
  userCache: {
    usedBytes: number;
    limitBytes: number;
    maxValueBytes: number;
    remainingBytes: number | null;
    evictionPolicy: 'lru' | 'disabled';
  };
  groups: Array<{
    name: string;
    count: number;
    memoryBytes: number;
    system: boolean;
    systemKind?: RedisAdminSystemKind;
    namespace?: string;
    scope: RedisAdminNamespaceScope;
  }>;
  topKeys: RedisAdminKeySummary[];
};

export type RedisAdminKeyDetail = RedisAdminKeySummary & {
  encoding?: string | null;
  value: unknown;
  truncated?: boolean;
};

export type RedisAdminKeysResponse = {
  cursor: string;
  count: number;
  keys: RedisAdminKeySummary[];
};

export type RedisAdminSetKeyInput = {
  key: string;
  type?: RedisAdminValueType;
  value: unknown;
  ttlSeconds?: number | null;
};

export type RuntimeQueueStats = {
  waiting: number;
  active: number;
  delayed: number;
  failed: number;
  failedJobs?: Array<{
    id: string;
    name: string;
    flowId?: string | number;
    flowName?: string;
    failedStepKey?: string;
    sourceFlowId?: string | number;
    sourceFlowName?: string;
    sourceStepKey?: string;
    failedReason?: string;
    attemptsMade: number;
    timestamp?: number;
    finishedOn?: number;
  }>;
};

export type RuntimeDbMetrics = {
  type?: string;
  pool?: unknown;
  [key: string]: unknown;
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
    dbAvailable: number;
    dbIdle: number;
    dbPending: number;
  };
  hardware?: {
    effectiveMemoryMb: number;
    effectiveCpuCount: number;
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
  queues: Record<string, RuntimeQueueStats | null>;
  websocket?: {
    total: number;
    namespaces: Array<{
      path: string;
      connected: number;
      users: number;
    }>;
  };
  db: RuntimeDbMetrics;
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
  appCluster?: {
    ttlMs: number;
    instances: Array<{
      instanceId: string;
      sampledAt: string;
      app: RuntimeAppMetrics;
    }>;
  };
  app?: RuntimeAppMetrics;
};

export type RuntimeAppMetrics = {
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
      instanceId?: string;
      reloadId?: string;
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
      context?: string;
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

export type RuntimeCacheReloadMetric = RuntimeAppMetrics['cache']['recent'][number];
export type RuntimeCacheReloadRow = RuntimeCacheReloadMetric & { instanceId: string };
export type RuntimeAppTelemetryCluster = NonNullable<RuntimeMetricsPayload['appCluster']>;
export type RuntimeAppMetricInstance = {
  instanceId: string;
  sampledAt: string;
  app?: RuntimeAppMetrics;
};
export type RuntimeRequestMetric = RuntimeAppMetrics['requests']['routes'][number];
export type RuntimeRequestRow = Pick<
  RuntimeRequestMetric,
  | 'method'
  | 'route'
  | 'count'
  | 'rps'
  | 'p50Ms'
  | 'p95Ms'
  | 'p99Ms'
  | 'status4xx'
  | 'status5xx'
>;
export type RuntimeDatabaseMetric = RuntimeAppMetrics['database']['queries'][number];
export type RuntimeDatabaseRow = {
  context: string;
  op: string;
  table: string;
  count: number;
  errors: number;
  poolAcquireTimeouts: number;
  slow: number;
  p95Ms: number;
  p99Ms: number;
};
export type RuntimeFlowMetric = RuntimeAppMetrics['flows']['rows'][number];
export type RuntimeFlowRow = {
  flowId: string | number;
  flowName: string;
  running: number;
  completed: number;
  failed: number;
  p95Ms: number;
  failedSteps: Array<{ step: string; count: number }>;
  slowSteps: Array<{ step: string; p95Ms: number }>;
};
export type RuntimeFlowFailedJobRow = NonNullable<RuntimeQueueStats['failedJobs']>[number] & {
  instanceId: string;
};
export type RuntimeClusterStats = NonNullable<RuntimeMetricsPayload['cluster']>;
export type RuntimeDbPoolRow = {
  name: string;
  used: number;
  pending: number;
  idle: number;
  available: number;
  max: number | null;
  healthy?: boolean;
  [key: string]: unknown;
};

export type RuntimeGuideGroup = {
  title: string;
  items: Array<[string, string]>;
};

export type RuntimeGuide = {
  title: string;
  description: string;
  groups: RuntimeGuideGroup[];
};
