import type {
  RuntimeAppMetricInstance,
  RuntimeCacheReloadRow,
} from '~/types/runtime-monitor';

export const RUNTIME_CACHE_FLOW_LABELS: Record<string, string> = {
  metadata: 'Schema metadata',
  route: 'Routes',
  graphql: 'GraphQL',
  guard: 'Guards',
  fieldPermission: 'Field permissions',
  setting: 'Settings',
  storage: 'Storage',
  oauth: 'OAuth',
  websocket: 'WebSockets',
  package: 'Packages',
  flow: 'Flows',
  folder: 'Folders',
  bootstrap: 'Bootstrap scripts',
  all: 'All caches',
};

export function runtimeCacheFlowLabel(flow: string): string {
  return RUNTIME_CACHE_FLOW_LABELS[flow] ?? flow;
}

export function runtimeCacheReloadRowKey(row: RuntimeCacheReloadRow): string {
  return row.reloadId ?? `${row.instanceId}:${row.completedAt}:${row.flow}:${row.table}`;
}

export function getRuntimeCacheReloadRows(
  instances: RuntimeAppMetricInstance[],
): RuntimeCacheReloadRow[] {
  const map = new Map<string, RuntimeCacheReloadRow>();

  for (const metrics of instances) {
    for (const row of metrics.app?.cache.recent ?? []) {
      const instanceId = row.instanceId ?? metrics.instanceId;
      const cacheRow = { ...row, instanceId };
      const key = runtimeCacheReloadRowKey(cacheRow);
      if (!map.has(key)) {
        map.set(key, cacheRow);
      }
    }
  }

  return [...map.values()]
    .sort((a, b) => Date.parse(b.completedAt) - Date.parse(a.completedAt))
    .slice(0, 20);
}
