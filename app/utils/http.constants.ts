export const HTTP_METHODS = ['GET', 'POST', 'PATCH', 'DELETE'] as const;

export type HttpMethod = (typeof HTTP_METHODS)[number];

const HTTP_METHOD_COLOR_MAP: Record<string, string> = {
  GET: 'info',
  POST: 'success',
  PATCH: 'warning',
  DELETE: 'error',
};

export function getHttpMethodColor(method: string): string {
  return HTTP_METHOD_COLOR_MAP[method] || 'neutral';
}
