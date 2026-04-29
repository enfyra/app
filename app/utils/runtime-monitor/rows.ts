import type {
  RuntimeAppMetricInstance,
  RuntimeDatabaseRow,
  RuntimeFlowFailedJobRow,
  RuntimeFlowRow,
  RuntimeMetricsPayload,
  RuntimeRequestRow,
} from '~/types/runtime-monitor';

type RuntimeFlowAccumulator = Omit<RuntimeFlowRow, 'failedSteps' | 'slowSteps'> & {
  failedSteps: Map<string, number>;
  slowSteps: Map<string, number>;
};

export function getRuntimeRequestRows(
  instances: RuntimeAppMetricInstance[],
): RuntimeRequestRow[] {
  const map = new Map<string, RuntimeRequestRow>();

  for (const metrics of instances) {
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
}

export function getRuntimeDatabaseRows(
  instances: RuntimeAppMetricInstance[],
): RuntimeDatabaseRow[] {
  const map = new Map<string, RuntimeDatabaseRow>();

  for (const metrics of instances) {
    for (const row of metrics.app?.database.queries ?? []) {
      const context = row.context ?? 'runtime';
      const key = `${context}:${row.op}:${row.table}`;
      const current =
        map.get(key) ??
        {
          context,
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
}

export function getRuntimeFlowRows(
  instances: RuntimeAppMetricInstance[],
): RuntimeFlowRow[] {
  const map = new Map<string, RuntimeFlowAccumulator>();

  for (const metrics of instances) {
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
        current.failedSteps.set(
          step.step,
          (current.failedSteps.get(step.step) ?? 0) + step.count,
        );
      }
      for (const step of row.slowSteps) {
        current.slowSteps.set(
          step.step,
          Math.max(current.slowSteps.get(step.step) ?? 0, step.p95Ms),
        );
      }
      map.set(key, current);
    }
  }

  return [...map.values()]
    .map((row) => ({
      ...row,
      failedSteps: [...row.failedSteps.entries()]
        .map(([step, count]) => ({ step, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3),
      slowSteps: [...row.slowSteps.entries()]
        .map(([step, p95Ms]) => ({ step, p95Ms }))
        .sort((a, b) => b.p95Ms - a.p95Ms)
        .slice(0, 3),
    }))
    .sort((a, b) => b.running - a.running || b.failed - a.failed || b.p95Ms - a.p95Ms)
    .slice(0, 20);
}

export function getRuntimeFlowFailedJobRows(
  instances: RuntimeMetricsPayload[],
): RuntimeFlowFailedJobRow[] {
  return instances
    .flatMap((metrics) =>
      (metrics.queues.flow?.failedJobs ?? []).map((job) => ({
        ...job,
        instanceId: metrics.instance.id,
      })),
    )
    .sort((a, b) => (b.finishedOn ?? b.timestamp ?? 0) - (a.finishedOn ?? a.timestamp ?? 0))
    .slice(0, 30);
}
