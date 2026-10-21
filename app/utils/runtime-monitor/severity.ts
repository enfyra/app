import type { RuntimeMetricsPayload, RuntimeSeverity } from '~/types/runtime-monitor';
import { maxSeverity, connectionQueueEntries } from './core';

export function taskErrorSeverity(metrics: RuntimeMetricsPayload): RuntimeSeverity {
  if (metrics.executor.taskTimeoutTotal > 0 || metrics.executor.crashesTotal > 0) {
    return 'error';
  }
  if (metrics.executor.taskErrorTotal > 0) return 'warning';
  return 'ok';
}

export function queueSeverity(queue: RuntimeMetricsPayload['queues'][string] | undefined): RuntimeSeverity {
  if (!queue) return 'ok';
  if (queue.failed >= 100) return 'error';
  if (queue.failed > 0) return 'warning';
  return 'ok';
}

export function contextSeverity(metrics: RuntimeMetricsPayload): RuntimeSeverity {
  return metrics.executor.pool.workers.some((worker) => (worker.contextStats.scrubFailed ?? 0) > 0)
    ? 'error'
    : 'ok';
}

export function overviewSeverity(_metrics: RuntimeMetricsPayload): RuntimeSeverity {
  return 'ok';
}

export function workerSeverity(metrics: RuntimeMetricsPayload): RuntimeSeverity {
  return maxSeverity(
    taskErrorSeverity(metrics),
    contextSeverity(metrics),
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
    (dbMetrics?.totalPoolAcquireTimeouts ?? 0) > 0 ? 'error' : 'ok',
    (dbMetrics?.totalErrors ?? 0) > 0 ? 'error' : 'ok',
  );
}
