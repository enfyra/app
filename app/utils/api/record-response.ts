export function extractCreatedRecord(response: any): any | null {
  if (!response) return null;
  if (Array.isArray(response)) return response[0] ?? null;
  if (Array.isArray(response.data)) return response.data[0] ?? null;
  if (response.data && typeof response.data === 'object') {
    if (Array.isArray(response.data.data)) return response.data.data[0] ?? null;
    return response.data;
  }
  return typeof response === 'object' ? response : null;
}
