import { describe, expect, it } from 'vitest';
import type { RuntimeMetricsPayload } from '../../app/types/runtime-monitor';
import { databaseSeverity, overviewSeverity, workerSeverity, flowSeverity, connectionSeverity } from '../../app/utils/runtime-monitor/severity';
import { databaseWarnings, overviewWarnings, workerWarnings, flowWarnings, connectionWarnings } from '../../app/utils/runtime-monitor/warnings';

function metrics() {
  return {
    instance: { eventLoopLagMs: 10000, heapUsedMb: 99, heapLimitMb: 100 },
    executor: {
      p99TaskMs: 10000, p99QueueWaitMs: 10000, maxHeapRatio: 0.99, rotationsTotal: 20,
      taskErrorTotal: 0, taskTimeoutTotal: 0, crashesTotal: 0,
      pool: { waitingTasks: 200, workers: [] },
    },
    db: { pool: { pending: 200 } },
    queues: {
      flow: { waiting: 2000, active: 0, delayed: 0, failed: 0 },
      websocket: { waiting: 2000, active: 0, delayed: 0, failed: 0 },
    },
    app: { database: { totalSlow: 200, totalErrors: 0, totalPoolAcquireTimeouts: 0 }, flows: { rows: [] } },
  } as unknown as RuntimeMetricsPayload;
}

describe('runtime monitor error-only health', () => {
  it('keeps timing, slow-query, memory and backlog metrics informational', () => {
    const sample = metrics();
    for (const severity of [overviewSeverity, workerSeverity, databaseSeverity, flowSeverity, connectionSeverity]) {
      expect(severity(sample)).toBe('ok');
    }
    for (const warnings of [overviewWarnings, workerWarnings, databaseWarnings, flowWarnings, connectionWarnings]) {
      expect(warnings(sample)).toEqual([]);
    }
  });

  it('retains query errors, pool timeouts and worker failures', () => {
    const sample = metrics();
    sample.app!.database.totalErrors = 1;
    sample.app!.database.totalPoolAcquireTimeouts = 2;
    sample.executor.taskErrorTotal = 1;
    sample.executor.taskTimeoutTotal = 1;
    sample.executor.crashesTotal = 1;
    expect(databaseSeverity(sample)).toBe('error');
    expect(databaseWarnings(sample)).toEqual(['2 DB pool acquire timeouts.', '1 DB query error.']);
    expect(workerSeverity(sample)).not.toBe('ok');
    expect(workerWarnings(sample)).toEqual(['1 executor task error.', '1 executor timeout.', '1 executor worker crash.']);
  });

  it('retains failed flow and websocket jobs', () => {
    const sample = metrics();
    sample.queues.flow!.failed = 1;
    sample.queues.websocket!.failed = 1;
    expect(flowSeverity(sample)).not.toBe('ok');
    expect(connectionSeverity(sample)).not.toBe('ok');
    expect(flowWarnings(sample)).toEqual(['Flow queue has 1 retained failed job.']);
    expect(connectionWarnings(sample)).toEqual(['websocket queue has 1 retained failed job.']);
  });
});
