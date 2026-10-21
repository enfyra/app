import type { RuntimeMetricsPayload } from '~/types/runtime-monitor';
import { connectionQueueEntries } from './core';

export function overviewWarnings(_metrics: RuntimeMetricsPayload): string[] {
  return [];
}

export function workerWarnings(metrics: RuntimeMetricsPayload) {
  const warnings: string[] = [];
  if (metrics.executor.taskErrorTotal > 0) warnings.push(`${metrics.executor.taskErrorTotal} executor task error${metrics.executor.taskErrorTotal > 1 ? 's' : ''}.`);
  if (metrics.executor.taskTimeoutTotal > 0) warnings.push(`${metrics.executor.taskTimeoutTotal} executor timeout${metrics.executor.taskTimeoutTotal > 1 ? 's' : ''}.`);
  if (metrics.executor.crashesTotal > 0) warnings.push(`${metrics.executor.crashesTotal} executor worker crash${metrics.executor.crashesTotal > 1 ? 'es' : ''}.`);
  if (metrics.executor.pool.workers.some((worker) => (worker.contextStats.scrubFailed ?? 0) > 0)) warnings.push('Context scrub failure detected.');
  return warnings;
}

export function flowWarnings(metrics: RuntimeMetricsPayload) {
  const warnings: string[] = [];
  const queue = metrics.queues.flow;
  if (queue?.failed && queue.failed > 0) warnings.push(`Flow queue has ${queue.failed} retained failed job${queue.failed > 1 ? 's' : ''}.`);
  const failed = (metrics.app?.flows.rows ?? []).reduce((sum, row) => sum + row.failed, 0);
  if (failed > 0) warnings.push(`${failed} flow execution${failed > 1 ? 's have' : ' has'} failed.`);
  return warnings;
}

export function databaseWarnings(metrics: RuntimeMetricsPayload) {
  const warnings: string[] = [];
  const timeouts = metrics.app?.database.totalPoolAcquireTimeouts ?? 0;
  const errors = metrics.app?.database.totalErrors ?? 0;
  if (timeouts > 0) warnings.push(`${timeouts} DB pool acquire timeout${timeouts > 1 ? 's' : ''}.`);
  if (errors > 0) warnings.push(`${errors} DB query error${errors > 1 ? 's' : ''}.`);
  return warnings;
}

export function connectionWarnings(metrics: RuntimeMetricsPayload) {
  const warnings: string[] = [];
  for (const [name, queue] of connectionQueueEntries(metrics)) {
    if (!queue) continue;
    if (queue.failed > 0) warnings.push(`${name} queue has ${queue.failed} retained failed job${queue.failed > 1 ? 's' : ''}.`);
  }
  return warnings;
}
