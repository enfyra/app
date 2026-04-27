import type { RuntimeMetricsPayload } from '~/types/runtime-monitor';
import { dbPoolRows, queueTotal, connectionQueueEntries } from './core';
import { fmtMs, fmtPercent } from './format';
import {
  heapSeverity,
  isolateHeapSeverity,
  queueSeverity,
} from './severity';

export function overviewWarnings(metrics: RuntimeMetricsPayload) {
  const warnings: string[] = [];
  if (metrics.instance.eventLoopLagMs >= 50) warnings.push(`Event loop delay is ${fmtMs(metrics.instance.eventLoopLagMs)}.`);
  if (heapSeverity(metrics) !== 'ok') warnings.push(`Main heap usage is ${fmtPercent(metrics.instance.heapUsedMb / (metrics.instance.heapLimitMb || metrics.instance.heapTotalMb))} of V8 limit.`);
  return warnings;
}

export function workerWarnings(metrics: RuntimeMetricsPayload) {
  const warnings: string[] = [];
  if (metrics.executor.pool.waitingTasks > 0) warnings.push(`${metrics.executor.pool.waitingTasks} executor task${metrics.executor.pool.waitingTasks > 1 ? 's are' : ' is'} waiting.`);
  if (isolateHeapSeverity(metrics) !== 'ok') warnings.push(`Isolate heap pressure is ${fmtPercent(metrics.executor.maxHeapRatio)}.`);
  if (metrics.executor.p99TaskMs >= 1000) warnings.push(`Executor p99 latency is ${fmtMs(metrics.executor.p99TaskMs)}.`);
  if (metrics.executor.taskErrorTotal > 0) warnings.push(`${metrics.executor.taskErrorTotal} executor task error${metrics.executor.taskErrorTotal > 1 ? 's' : ''}.`);
  if (metrics.executor.taskTimeoutTotal > 0) warnings.push(`${metrics.executor.taskTimeoutTotal} executor timeout${metrics.executor.taskTimeoutTotal > 1 ? 's' : ''}.`);
  if (metrics.executor.crashesTotal > 0) warnings.push(`${metrics.executor.crashesTotal} executor worker crash${metrics.executor.crashesTotal > 1 ? 'es' : ''}.`);
  if (metrics.executor.pool.workers.some((worker) => (worker.contextStats.scrubFailed ?? 0) > 0)) warnings.push('Context scrub failure detected.');
  if (metrics.executor.rotationsTotal >= 10) warnings.push(`${metrics.executor.rotationsTotal} executor rotations.`);
  return warnings;
}

export function flowWarnings(metrics: RuntimeMetricsPayload) {
  const warnings: string[] = [];
  const queue = metrics.queues.flow;
  if (queue?.failed && queue.failed > 0) warnings.push(`Flow queue has ${queue.failed} retained failed job${queue.failed > 1 ? 's' : ''}.`);
  const total = queueTotal(queue);
  if (total >= 100) warnings.push(`Flow queue depth is ${total}.`);
  const failed = (metrics.app?.flows.rows ?? []).reduce((sum, row) => sum + row.failed, 0);
  if (failed > 0) warnings.push(`${failed} flow execution${failed > 1 ? 's have' : ' has'} failed.`);
  return warnings;
}

export function databaseWarnings(metrics: RuntimeMetricsPayload) {
  const warnings: string[] = [];
  const pendingDb = dbPoolRows(metrics).reduce((sum, row: any) => sum + (row.pending ?? 0), 0);
  if (pendingDb > 0) warnings.push(`DB pool has ${pendingDb} pending request${pendingDb > 1 ? 's' : ''}.`);
  return warnings;
}

export function connectionWarnings(metrics: RuntimeMetricsPayload) {
  const warnings: string[] = [];
  for (const [name, queue] of connectionQueueEntries(metrics)) {
    if (!queue) continue;
    if (queue.failed > 0) warnings.push(`${name} queue has ${queue.failed} retained failed job${queue.failed > 1 ? 's' : ''}.`);
    const total = queueTotal(queue);
    if (total >= 100) warnings.push(`${name} queue depth is ${total}.`);
    if (queueSeverity(queue) === 'error' && total < 100) warnings.push(`${name} queue has critical failed job retention.`);
  }
  return warnings;
}
