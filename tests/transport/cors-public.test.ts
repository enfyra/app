import { createServer, type Server } from 'node:http';
import { createApp, defineEventHandler, toNodeListener } from 'h3';
import { afterEach, describe, expect, it, vi } from 'vitest';
import corsMiddleware, { clearCorsCache, initCorsCache } from '../../server/middleware/cors';
import { proxyToAPI } from '../../app/utils/enfyra/server/proxy';

const config = { public: { apiUrl: '' } };
vi.stubGlobal('useRuntimeConfig', () => config);
const servers: Server[] = [];

async function listen(server: Server) {
  servers.push(server);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing test port');
  return `http://127.0.0.1:${address.port}`;
}

afterEach(async () => {
  await clearCorsCache();
  await Promise.all(servers.splice(0).map(server => new Promise<void>(resolve => {
    server.closeAllConnections();
    server.close(() => resolve());
  })));
});

describe('CORS public bridge transport', () => {
  it('answers public preflight and preserves wildcard through the actual proxy', async () => {
    config.public.apiUrl = await listen(createServer((_req, res) => {
      res.setHeader('access-control-allow-origin', 'https://upstream.invalid');
      res.setHeader('access-control-allow-credentials', 'true');
      res.end('ok');
    }));
    await clearCorsCache([]);
    const app = createApp().use(corsMiddleware).use(defineEventHandler(event => proxyToAPI(event)));
    const url = await listen(createServer(toNodeListener(app)));
    const preflight = await fetch(url + '/api/items', { method: 'OPTIONS', headers: { origin: 'https://external.invalid', 'access-control-request-method': 'POST', 'access-control-request-headers': 'authorization, x-enfyra-pat' } });
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get('access-control-allow-origin')).toBe('*');
    expect(preflight.headers.get('access-control-allow-credentials')).toBeNull();
    expect(preflight.headers.get('access-control-allow-headers')).toBe('authorization, x-enfyra-pat');
    const response = await fetch(url + '/api/items', { headers: { origin: 'https://external.invalid' } });
    expect(response.headers.get('access-control-allow-origin')).toBe('*');
    expect(response.headers.get('access-control-allow-credentials')).toBeNull();
    expect(await response.text()).toBe('ok');
  });

  it('grants only the configured origin and denies other preflights and mutations', async () => {
    config.public.apiUrl = await listen(createServer((req, res) => {
      if (req.url?.startsWith('/enfyra_cors_origin')) {
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify({ data: [{ value: 'https://allowed.invalid', isEnabled: true }] }));
        return;
      }
      res.end('ok');
    }));
    await initCorsCache();
    const app = createApp().use(corsMiddleware).use(defineEventHandler(event => proxyToAPI(event)));
    const url = await listen(createServer(toNodeListener(app)));
    const allowed = await fetch(url + '/api/items', { headers: { origin: 'https://allowed.invalid' } });
    expect(allowed.headers.get('access-control-allow-origin')).toBe('https://allowed.invalid');
    expect(allowed.headers.get('access-control-allow-credentials')).toBe('true');
    const denied = await fetch(url + '/api/items', { method: 'OPTIONS', headers: { origin: 'https://other.invalid', 'access-control-request-method': 'POST' } });
    expect(denied.status).toBe(403);
    expect(denied.headers.get('access-control-allow-origin')).toBeNull();
    const mutation = await fetch(url + '/api/items', { method: 'POST', headers: { origin: 'https://other.invalid' } });
    expect(mutation.status).toBe(403);
  });

  it.each([{}, { data: [{ value: '*', isEnabled: true }] }])('fails closed for malformed origin response %j', async data => {
    config.public.apiUrl = await listen(createServer((_req, res) => {
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify(data));
    }));
    await initCorsCache();
    const app = createApp().use(corsMiddleware).use(defineEventHandler(() => 'unexpected'));
    const url = await listen(createServer(toNodeListener(app)));
    const response = await fetch(url + '/api/items', { method: 'OPTIONS', headers: { origin: 'https://external.invalid', 'access-control-request-method': 'POST' } });
    expect(response.status).toBe(403);
    expect(response.headers.get('access-control-allow-origin')).toBeNull();
  });
});
