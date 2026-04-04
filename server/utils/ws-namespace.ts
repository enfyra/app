export function stripWsNs(data: string): string {
  return data.replace(/^(\d)\/ws\//, '$1/');
}

export function addWsNs(data: string): string {
  return data.replace(/^(\d)\//, '$1/ws/');
}
