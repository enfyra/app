export type RuntimeSeverity = 'ok' | 'warning' | 'error';

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

export type RuntimeGuideGroup = {
  title: string;
  items: Array<[string, string]>;
};

export type RuntimeGuide = {
  title: string;
  description: string;
  groups: RuntimeGuideGroup[];
};
