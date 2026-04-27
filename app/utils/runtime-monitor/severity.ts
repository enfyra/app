import type { RuntimeMetricsPayload, RuntimeSeverity } from '~/types/runtime-monitor';
import { dbPoolRows, maxSeverity, queueTotal, connectionQueueEntries } from './core';

export function heapSeverity(metrics: RuntimeMetricsPayload): RuntimeSeverity {
  const limit = metrics.instance.heapLimitMb;
  if (!limit) return 'ok';
  const ratio = metrics.instance.heapUsedMb / limit;
  if (ratio >= 0.9) return 'error';
  if (ratio >= 0.75) return 'warning';
  return 'ok';
}

export function isolateHeapSeverity(metrics: RuntimeMetricsPayload): RuntimeSeverity {
  const ratio = metrics.executor.maxHeapRatio;
  if (ratio >= 0.85) return 'error';
  if (ratio >= 0.65) return 'warning';
  return 'ok';
}

export function eventLoopSeverity(metrics: RuntimeMetricsPayload): RuntimeSeverity {
  const value = metrics.instance.eventLoopLagMs;
  if (value >= 200) return 'error';
  if (value >= 50) return 'warning';
  return 'ok';
}

export function executorQueueSeverity(metrics: RuntimeMetricsPayload): RuntimeSeverity {
  const waiting = metrics.executor.pool.waitingTasks;
  if (waiting >= 100) return 'error';
  if (waiting > 0) return 'warning';
  return 'ok';
}

export function taskLatencySeverity(metrics: RuntimeMetricsPayload): RuntimeSeverity {
  const p99 = metrics.executor.p99TaskMs;
  if (p99 >= 5000) return 'error';
  if (p99 >= 1000) return 'warning';
  return 'ok';
}

export function taskErrorSeverity(metrics: RuntimeMetricsPayload): RuntimeSeverity {
  if (metrics.executor.taskTimeoutTotal > 0 || metrics.executor.crashesTotal > 0) {
    return 'error';
  }
  if (metrics.executor.taskErrorTotal > 0) return 'warning';
  return 'ok';
}

export function dbSeverity(metrics: RuntimeMetricsPayload): RuntimeSeverity {
  const pending = dbPoolRows(metrics).reduce((sum, row: any) => sum + (row.pending ?? 0), 0);
  if (pending >= 100) return 'error';
  if (pending > 0) return 'warning';
  return 'ok';
}

export function queueSeverity(queue: RuntimeMetricsPayload['queues'][string] | undefined): RuntimeSeverity {
  if (!queue) return 'ok';
  const total = queueTotal(queue);
  if (total >= 1000 || queue.failed >= 100) return 'error';
  if (total >= 100 || queue.failed > 0) return 'warning';
  return 'ok';
}

export function contextSeverity(metrics: RuntimeMetricsPayload): RuntimeSeverity {
  return metrics.executor.pool.workers.some((worker) => (worker.contextStats.scrubFailed ?? 0) > 0)
    ? 'error'
    : 'ok';
}

export function rotationSeverity(metrics: RuntimeMetricsPayload): RuntimeSeverity {
  if (metrics.executor.rotationsTotal >= 10) return 'warning';
  return 'ok';
}

export function overviewSeverity(metrics: RuntimeMetricsPayload): RuntimeSeverity {
  return maxSeverity(heapSeverity(metrics), eventLoopSeverity(metrics));
}

export function workerSeverity(metrics: RuntimeMetricsPayload): RuntimeSeverity {
  return maxSeverity(
    isolateHeapSeverity(metrics),
    executorQueueSeverity(metrics),
    taskLatencySeverity(metrics),
    taskErrorSeverity(metrics),
    contextSeverity(metrics),
    rotationSeverity(metrics),
  );
}

export function flowSeverity(metrics: RuntimeMetricsPayload): RuntimeSeverity {
  const queue = metrics.queues.flow;
  const hasFailedFlow = (metrics.app?.flows.rows ?? []).some((row) => row.failed > 0);
  return maxSeverity(queueSeverity(queue), hasFailedFlow ? 'error' : 'ok');
}

export function connectionSeverity(metrics: RuntimeMetricsPayload): RuntimeSeverity {
  return maxSeverity(...connectionQueueEntries(metrics).map(([, queue]) => queueSeverity(queue)));
}

export function databaseSeverity(metrics: RuntimeMetricsPayload): RuntimeSeverity {
  const dbMetrics = metrics.app?.database;
  return maxSeverity(
    dbSeverity(metrics),
    (dbMetrics?.totalPoolAcquireTimeouts ?? 0) > 0 ? 'error' : 'ok',
    (dbMetrics?.totalErrors ?? 0) > 0 ? 'error' : 'ok',
    (dbMetrics?.totalSlow ?? 0) > 0 ? 'warning' : 'ok',
  );
}
