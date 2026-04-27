import type {
  RuntimeMetricsPayload,
  RuntimeQueueStats,
  RuntimeSeverity,
} from '~/types/runtime-monitor';

export function severityRank(severity: RuntimeSeverity) {
  if (severity === 'error') return 2;
  if (severity === 'warning') return 1;
  return 0;
}

export function maxSeverity(...values: RuntimeSeverity[]): RuntimeSeverity {
  return values.reduce(
    (current, next) =>
      severityRank(next) > severityRank(current) ? next : current,
    'ok' as RuntimeSeverity,
  );
}

export function metricTextClass(severity: RuntimeSeverity) {
  if (severity === 'error') return 'text-error-600 dark:text-error-400';
  if (severity === 'warning') return 'text-warning-600 dark:text-warning-400';
  return 'text-[var(--text-primary)]';
}

export function badgeColor(severity: RuntimeSeverity) {
  if (severity === 'error') return 'error';
  if (severity === 'warning') return 'warning';
  return 'success';
}

export function methodColor(method: string) {
  switch (method.toUpperCase()) {
    case 'GET':
      return 'info';
    case 'POST':
      return 'success';
    case 'PATCH':
      return 'warning';
    case 'PUT':
      return 'primary';
    case 'DELETE':
      return 'error';
    default:
      return 'neutral';
  }
}

export function shortText(value: unknown, head = 18, tail = 6) {
  const text = String(value ?? '');
  if (text.length <= head + tail + 1) return text;
  return `${text.slice(0, head)}...${text.slice(-tail)}`;
}

export function queueTotal(queue: RuntimeQueueStats | null | undefined) {
  if (!queue) return 0;
  return queue.waiting + queue.active + queue.delayed + queue.failed;
}

export function dbPoolRows(metrics: RuntimeMetricsPayload) {
  const pool = metrics.db?.pool;
  if (!pool) return [];
  if (pool.master || Array.isArray(pool.replicas)) {
    return [
      { name: 'master', ...(pool.master ?? {}) },
      ...(pool.replicas ?? []).map((replica: any, index: number) => ({
        name: `replica ${index + 1}`,
        healthy: replica.healthy,
        ...(replica.pool ?? {}),
      })),
    ];
  }
  return [{ name: 'pool', ...pool }];
}

export function websocketRows(metrics: RuntimeMetricsPayload) {
  return metrics.websocket?.namespaces ?? [];
}

export function connectionQueueEntries(metrics: RuntimeMetricsPayload) {
  return Object.entries(metrics.queues).filter(([name]) => name !== 'flow');
}
