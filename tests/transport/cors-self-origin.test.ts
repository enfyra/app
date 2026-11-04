import { createServer, request, type Server } from 'node:http';
import { createApp, defineEventHandler, toNodeListener } from 'h3';
import { afterEach, describe, expect, it, vi } from 'vitest';
import corsMiddleware, { clearCorsCache } from '../../server/middleware/cors';
import { proxyToAPI } from '../../app/utils/enfyra/server/proxy';
import { createCorsOriginProxyHandler } from '../../server/utils/cors-origin-proxy';
import login from '../../server/api/login.post';

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

async function postWithHost(url: string, origin: string) {
  return new Promise<number>((resolve, reject) => {
    const req = request(`${url}/api/items`, {
      method: 'POST', headers: { host: 'admin.example.test', origin, 'x-forwarded-proto': 'https' },
    }, res => {
      res.resume();
      res.on('end', () => resolve(res.statusCode!));
      res.on('error', reject);
    });
    req.setTimeout(2000, () => req.destroy(new Error('Fixture timeout')));
    req.on('error', reject);
    req.end();
  });
}

afterEach(async () => {
  await clearCorsCache();
  await Promise.all(servers.splice(0).map(server => new Promise<void>(resolve => {
    server.closeAllConnections();
    server.close(() => resolve());
  })));
});

describe('eApp same-origin CORS recovery', () => {
  it('keeps authenticated CRUD usable after the first external origin and retains client provenance', async () => {
    let origins: string[] = [];
    const mutations: string[] = [];
    config.public.apiUrl = await listen(createServer((req, res) => {
      res.setHeader('content-type', 'application/json');
      if (req.method === 'GET' && req.url?.startsWith('/enfyra_cors_origin')) {
        res.end(JSON.stringify({ data: origins.map(value => ({ value, isEnabled: true })) }));
        return;
      }
      if (req.headers.origin && !origins.includes(req.headers.origin)) {
        res.writeHead(403).end('{}');
        return;
      }
      if (req.headers.authorization !== 'Bearer synthetic-admin') {
        res.writeHead(401).end('{}');
        return;
      }
      expect(req.headers.origin).toBeUndefined();
      const context = JSON.parse(Buffer.from(String(req.headers['x-enfyra-client-context']), 'base64url').toString());
      expect(context.headers.origin).toBe(appUrl);
      mutations.push(req.method!);
      origins = req.method === 'DELETE' ? [] : ['https://client.example.test'];
      res.end('{}');
    }));
    const app = createApp().use(corsMiddleware).use(defineEventHandler(event => proxyToAPI(event)));
    const appUrl = await listen(createServer(toNodeListener(app)));
    await clearCorsCache([]);
    for (const method of ['POST', 'PATCH', 'DELETE']) {
      const response = await fetch(`${appUrl}/api/enfyra_cors_origin`, {
        method, headers: { origin: appUrl, authorization: 'Bearer synthetic-admin', 'content-type': 'application/json' }, body: '{}',
      });
      expect(response.status).toBe(200);
      await response.text();
      await clearCorsCache(origins);
    }
    expect(mutations).toEqual(['POST', 'PATCH', 'DELETE']);
    const unauthorized = await fetch(`${appUrl}/api/items`, { method: 'POST', headers: { origin: appUrl } });
    expect(unauthorized.status).toBe(401);
    await unauthorized.text();
  });

  it.each(['POST', 'PATCH', 'DELETE'] as const)('keeps the dedicated %s bridge usable with a restrictive list', async method => {
    config.public.apiUrl = await listen(createServer((req, res) => {
      expect(req.headers.origin).toBeUndefined();
      expect(req.headers['x-enfyra-pat']).toBe('synthetic-pat');
      expect(req.method).toBe(method);
      res.setHeader('content-type', 'application/json');
      res.end('{}');
    }));
    await clearCorsCache(['https://client.example.test']);
    const app = createApp().use(corsMiddleware).use(createCorsOriginProxyHandler({ method, path: '/enfyra_cors_origin' }));
    const url = await listen(createServer(toNodeListener(app)));
    const response = await fetch(`${url}/api/enfyra_cors_origin`, {
      method, headers: { origin: url, 'x-enfyra-pat': 'synthetic-pat', 'content-type': 'application/json' },
      ...(method === 'DELETE' ? {} : { body: '{}' }),
    });
    expect(response.status).toBe(200);
    await response.text();
  });

  it('keeps password login and a validated same-app return target usable', async () => {
    config.public.apiUrl = await listen(createServer((req, res) => {
      expect(req.headers.origin).toBeUndefined();
      expect(req.url).toBe('/auth/login');
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ accessToken: 'synthetic-access', refreshToken: 'synthetic-refresh', expTime: 9999999999 }));
    }));
    await clearCorsCache(['https://client.example.test']);
    const url = await listen(createServer(toNodeListener(createApp().use(corsMiddleware).use(login))));
    const response = await fetch(`${url}/api/login`, {
      method: 'POST', headers: { origin: url, 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'admin@example.test', password: 'synthetic-password', redirect: '/settings' }),
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ redirect: `${url}/settings` });
    expect(response.headers.get('set-cookie')).toContain('accessToken=synthetic-access');
  });

  it('does not depend on loading the external list for a same-origin mutation', async () => {
    await clearCorsCache();
    const fetchOrigins = vi.fn();
    config.public.apiUrl = await listen(createServer((_req, res) => {
      fetchOrigins();
      res.writeHead(503).end();
    }));
    const app = createApp().use(corsMiddleware).use(defineEventHandler(() => 'ok'));
    const url = await listen(createServer(toNodeListener(app)));
    const response = await fetch(`${url}/api/items`, { method: 'POST', headers: { origin: url } });
    expect(response.status).toBe(200);
    await response.text();
    expect(fetchOrigins).not.toHaveBeenCalled();
  });

  it.each([
    { origin: 'https://evil.example.test' },
    { origin: 'https://evil.example.test', 'x-forwarded-host': 'evil.example.test', 'x-forwarded-proto': 'https' },
    { origin: 'null', 'sec-fetch-site': 'same-origin' },
    { origin: 'https://client.example.test.evil.test' },
  ])('rejects unlisted cross-origin writes before dispatch: %j', async headers => {
    await clearCorsCache(['https://client.example.test']);
    const dispatch = vi.fn();
    const app = createApp().use(corsMiddleware).use(defineEventHandler(() => { dispatch(); return 'unexpected'; }));
    const url = await listen(createServer(toNodeListener(app)));
    const response = await fetch(`${url}/api/items`, { method: 'POST', headers });
    expect(response.status).toBe(403);
    expect(response.headers.get('access-control-allow-origin')).toBeNull();
    await response.text();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('recognizes the preserved public HTTPS origin behind private TLS termination', async () => {
    config.public.apiUrl = await listen(createServer((req, res) => {
      expect(req.headers.origin).toBeUndefined();
      res.end('ok');
    }));
    await clearCorsCache(['https://client.example.test']);
    const url = await listen(createServer(toNodeListener(createApp().use(corsMiddleware).use(defineEventHandler(event => proxyToAPI(event))))));
    expect(await postWithHost(url, 'https://admin.example.test')).toBe(200);
  });

  it.each(['http://admin.example.test', 'https://admin.example.test:8443', 'https://admin.example.test.evil.test'])('does not exempt a different scheme, port or host: %s', async origin => {
    await clearCorsCache(['https://client.example.test']);
    const dispatch = vi.fn();
    const url = await listen(createServer(toNodeListener(createApp().use(corsMiddleware).use(defineEventHandler(() => { dispatch(); return 'unexpected'; })))));
    expect(await postWithHost(url, origin)).toBe(403);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('preserves the exact Origin for allowed external requests on both proxy paths', async () => {
    let calls = 0;
    const origin = 'https://client.example.test';
    config.public.apiUrl = await listen(createServer((req, res) => {
      expect(req.headers.origin).toBe(origin);
      calls++;
      res.setHeader('content-type', 'application/json');
      res.end('{}');
    }));
    for (const handler of [defineEventHandler(event => proxyToAPI(event)), createCorsOriginProxyHandler({ method: 'POST', path: '/enfyra_cors_origin' })]) {
      await clearCorsCache([origin]);
      const url = await listen(createServer(toNodeListener(createApp().use(corsMiddleware).use(handler))));
      const response = await fetch(`${url}/api/enfyra_cors_origin`, { method: 'POST', headers: { origin } });
      expect(response.status).toBe(200);
      expect(response.headers.get('access-control-allow-origin')).toBe(origin);
      expect(response.headers.get('access-control-allow-credentials')).toBe('true');
      await response.text();
    }
    expect(calls).toBe(2);
  });
});
