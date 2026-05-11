export function stripWsNs(data: string): string {
  return data.replace(/^(\d)\/ws\//, '$1/');
}

export function addWsNs(data: string): string {
  return data.replace(/^(\d)\//, '$1/ws/');
}

export function getSocketIoNamespace(data: string): string | null {
  const match = data.match(/^\d+(\/[^,]*)(?:,|$)/);
  return match?.[1] ?? null;
}

export function rewriteSocketIoNamespace(
  data: string,
  namespace: string,
): string {
  return data.replace(/^(\d+)\/[^,]*(?=,|$)/, `$1${namespace}`);
}
