import { afterEach, describe, expect, it } from 'vitest';
import corsMiddleware, {
  clearCorsCache,
} from '../../server/middleware/cors';

function eventFor(path: string, origin: string | undefined, method = 'POST') {
  const headers: Record<string, string> = {};
  const removed: string[] = [];
  const statuses: number[] = [];
  const context: Record<string, unknown> = {};
  const reqHeaders: Record<string, string> = {};
  if (origin) reqHeaders.origin = origin;
  return {
    path,
    method,
    context,
    node: {
      req: { url: path, method, headers: reqHeaders },
      res: {
        setHeader: (name: string, value: string) => {
          headers[name] = value;
        },
        removeHeader: (name: string) => {
          removed.push(name);
        },
        statusCode: 200,
      },
    },
    __headers: headers,
    __removed: removed,
    __statuses: statuses,
    __origin: origin,
  };
}

describe('CORS middleware API prefix ownership', () => {
  afterEach(() => {
    clearCorsCache();
  });

  it('applies the configured allow-list to a decoded /api path', async () => {
    clearCorsCache(['https://allowed.invalid']);
    const allowed = eventFor('/api/enfyra_cors_origin', 'https://allowed.invalid');
    await corsMiddleware(allowed as any);
    expect((allowed as any).context.corsOrigin).toEqual({
      allowed: true,
      corsOrigin: 'https://allowed.invalid',
    });

    const denied = eventFor('/api/enfyra_cors_origin', 'https://evil.invalid');
    const rejection = await corsMiddleware(denied as any);
    expect((rejection as any)?.statusCode).toBe(403);
    expect((denied as any).context.corsOrigin).toEqual({
      allowed: false,
      corsOrigin: null,
    });
  });

  it('keeps non-API paths outside the CORS contract', async () => {
    clearCorsCache(['https://allowed.invalid']);
    const asset = eventFor('/assets/file-1', 'https://evil.invalid', 'GET');
    await corsMiddleware(asset as any);
    expect((asset as any).context.corsOrigin).toBeUndefined();
  });

  it('grants wildcard CORS without credentials to an empty allow-list', async () => {
    clearCorsCache([]);
    const event = eventFor('/api/items', 'https://sibling.invalid', 'GET');
    await corsMiddleware(event as any);
    expect(event.context.corsOrigin).toEqual({ allowed: true, corsOrigin: '*' });
    expect(event.__headers['Access-Control-Allow-Origin']).toBe('*');
    expect(event.__headers['Access-Control-Allow-Credentials']).toBeUndefined();
  });
});
