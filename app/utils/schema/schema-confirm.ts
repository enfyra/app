export function isSchemaMutationPreviewResponse(response: unknown): boolean {
  const record = (response as { data?: unknown[] } | null)?.data?.[0];
  return Boolean(record && typeof record === 'object' && (record as { _preview?: unknown })._preview === true);
}
