import type {
  RuntimeDbPoolRow,
  RuntimeMetricsPayload,
  RuntimeQueueStats,
  RuntimeSeverity,
} from '~/types/runtime-monitor';

type RuntimeDbPoolSource = {
  used?: number;
  pending?: number;
  max?: number | null;
  idle?: number;
  available?: number;
  healthy?: boolean;
  master?: RuntimeDbPoolSource;
  replicas?: Array<{
    healthy?: boolean;
    pool?: RuntimeDbPoolSource;
  }>;
  [key: string]: unknown;
};

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

export function dbPoolRows(metrics: RuntimeMetricsPayload): RuntimeDbPoolRow[] {
  const pool = metrics.db?.pool as RuntimeDbPoolSource | undefined;
  if (!pool) return [];
  const normalize = (
    name: string,
    row: RuntimeDbPoolSource,
    healthy?: boolean,
  ): RuntimeDbPoolRow => {
    const used = row?.used ?? 0;
    const pending = row?.pending ?? 0;
    const max = row?.max ?? null;
    const idle = row?.idle ?? 0;
    const available =
      row?.available ??
      (max == null ? 0 : Math.max(0, max - used - pending));
    return {
      name,
      used,
      pending,
      idle,
      available,
      max,
      healthy,
    };
  };
  if (pool.master || Array.isArray(pool.replicas)) {
    return [
      normalize('master', pool.master ?? {}),
      ...(pool.replicas ?? []).map((replica, index) =>
        normalize(`replica ${index + 1}`, replica.pool ?? {}, replica.healthy),
      ),
    ];
  }
  return [normalize('pool', pool)];
}

export function websocketRows(metrics: RuntimeMetricsPayload) {
  return metrics.websocket?.namespaces ?? [];
}

export function connectionQueueEntries(metrics: RuntimeMetricsPayload) {
  return Object.entries(metrics.queues).filter(([name]) => name !== 'flow');
}
