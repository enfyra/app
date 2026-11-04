import { createServer, request, type Server } from 'node:http';
import { createApp, defineEventHandler, proxyRequest, toNodeListener } from 'h3';
import { $fetch } from 'ofetch';
import { afterEach, describe, expect, it, vi } from 'vitest';
import api from '../../server/api/[...]';
import { clearCorsCache } from '../../server/middleware/cors';

const authPolicy = vi.hoisted(() => ({ loaded: true, origins: [] as string[] }));
vi.mock('../../server/utils/auth-origins', () => ({ getValidatedAuthOrigins: async () => authPolicy }));

const servers: Server[] = [];

async function listen(server: Server) {
  servers.push(server);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing test port');
  return `http://127.0.0.1:${address.port}`;
}

afterEach(async () => {
  authPolicy.loaded = true;
  authPolicy.origins = [];
  await clearCorsCache();
  vi.unstubAllGlobals();
  await Promise.all(servers.splice(0).map(server => new Promise<void>(resolve => {
    server.closeAllConnections();
    server.close(() => resolve());
  })));
});

function navigate(url: string, path: string) {
  return new Promise<{ status: number; location: string; cookies: string[] }>((resolve, reject) => {
    const req = request(url + path, { headers: {
      host: new URL(url).host,
      'x-forwarded-host': 'console.example.test',
      'x-forwarded-proto': 'https',
    } }, res => {
      res.resume();
      res.on('end', () => resolve({ status: res.statusCode!, location: res.headers.location ?? '', cookies: res.headers['set-cookie'] ?? [] }));
      res.on('error', reject);
    });
    req.setTimeout(2000, () => req.destroy(new Error('Fixture timeout')));
    req.on('error', reject);
    req.end();
  });
}

describe('external OAuth navigation through a private eApp upstream', () => {
  it.each([{ origins: [] }, { origins: ['https://allowed.example.test'] }])('does not send rejected OAuth recovery to the private Host with policy %j', async ({ origins }) => {
    const upstream = vi.fn();
    const apiUrl = await listen(createServer((_req, res) => { upstream(); res.end('{}'); }));
    vi.stubGlobal('useRuntimeConfig', () => ({ public: { apiUrl } }));
    authPolicy.origins = origins;
    await clearCorsCache([]);
    const url = await listen(createServer(toNodeListener(createApp().use(api))));
    const redirect = 'https://console.example.test/login';
    const response = await navigate(url, `/api/auth/google?redirect=${encodeURIComponent(redirect)}&cookieBridgePrefix=/enfyra`);
    expect(response.status).toBe(302);
    expect(response.location.startsWith('/login?')).toBe(true);
    expect(new URL(response.location, 'https://console.example.test').origin).toBe('https://console.example.test');
    expect(response.location).not.toContain('127.0.0.1');
    expect(response.cookies).toEqual([]);
    expect(upstream).not.toHaveBeenCalled();
  });

  it('keeps rejection recovery on the browser-facing site through an actual proxy hop', async () => {
    const upstream = vi.fn();
    const apiUrl = await listen(createServer((_req, res) => { upstream(); res.end('{}'); }));
    vi.stubGlobal('useRuntimeConfig', () => ({ public: { apiUrl } }));
    await clearCorsCache([]);
    const privateUrl = await listen(createServer(toNodeListener(createApp().use(api))));
    const publicUrl = await listen(createServer(toNodeListener(createApp().use(defineEventHandler(event => {
      const path = event.path.replace(/^\/enfyra/, '/api');
      return proxyRequest(event, privateUrl + path, { fetchOptions: { redirect: 'manual' } });
    })))));
    const response = await fetch(`${publicUrl}/enfyra/auth/google?redirect=${encodeURIComponent(publicUrl + '/login')}&cookieBridgePrefix=/enfyra`, { redirect: 'manual' });
    await response.text();
    expect(response.status).toBe(302);
    const location = new URL(response.headers.get('location')!, publicUrl);
    expect(location.origin).toBe(publicUrl);
    expect(location.pathname).toBe('/login');
    expect(location.searchParams.get('error')).toBe('Redirect origin is not allowed');
    expect(upstream).not.toHaveBeenCalled();
  });

  it('keeps allowlisted external OAuth initiation working with a private Host', async () => {
    let suppliedRedirect: URL | undefined;
    const apiUrl = await listen(createServer((req, res) => {
      suppliedRedirect = new URL(new URL(req.url!, 'http://backend.test').searchParams.get('redirect')!);
      res.writeHead(302, { location: 'https://provider.example.test/authorize' }).end();
    }));
    vi.stubGlobal('useRuntimeConfig', () => ({ public: { apiUrl } }));
    authPolicy.origins = ['https://console.example.test'];
    await clearCorsCache([]);
    const url = await listen(createServer(toNodeListener(createApp().use(api))));
    const response = await navigate(url, '/api/auth/google?redirect=https%3A%2F%2Fconsole.example.test%2Flogin&cookieBridgePrefix=/enfyra');
    expect(response.status).toBe(302);
    expect(response.location).toBe('https://provider.example.test/authorize');
    expect(suppliedRedirect?.origin).toBe('https://console.example.test');
    expect(suppliedRedirect?.searchParams.has('__enfyra_oauth_nonce')).toBe(true);
    expect(response.cookies.join(';')).toContain('enfyra_oauth_nonce=');
  });

  it('finalizes allowlisted external OAuth only for the initiating browser through its same-origin proxy', async () => {
    let boundRedirect = '';
    const exchange = vi.fn();
    const apiUrl = await listen(createServer((req, res) => {
      if (req.method === 'POST' && req.url === '/auth/oauth/exchange') {
        exchange();
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify({ accessToken: 'synthetic-access', refreshToken: 'synthetic-refresh', expTime: 9999999999 }));
        return;
      }
      boundRedirect = new URL(req.url!, 'http://backend.test').searchParams.get('redirect')!;
      res.writeHead(302, { location: 'https://provider.example.test/authorize' }).end();
    }));
    vi.stubGlobal('useRuntimeConfig', () => ({ public: { apiUrl } }));
    vi.stubGlobal('$fetch', $fetch);
    const privateUrl = await listen(createServer(toNodeListener(createApp().use(api))));
    const publicUrl = await listen(createServer(toNodeListener(createApp().use(defineEventHandler(event => proxyRequest(
      event, privateUrl + event.path.replace(/^\/enfyra/, '/api'), { fetchOptions: { redirect: 'manual' } },
    ))))));
    authPolicy.origins = [publicUrl];
    await clearCorsCache([]);
    const redirect = publicUrl + '/login?redirect=%2Fvi%2Fplayground%2Fchat%3Fmodel%3Dfixture';
    const start = await fetch(`${publicUrl}/enfyra/auth/google?redirect=${encodeURIComponent(redirect)}&cookieBridgePrefix=/enfyra`, { redirect: 'manual' });
    await start.text();
    expect(start.status).toBe(302);
    const cookie = start.headers.getSetCookie().find(value => value.startsWith('enfyra_oauth_nonce='))!.split(';')[0]!;
    const callback = `${publicUrl}/enfyra/auth/set-cookies?code=synthetic-code&redirect=${encodeURIComponent(boundRedirect)}`;
    const rejected = await fetch(callback, { redirect: 'manual' });
    await rejected.text();
    expect(rejected.status).toBe(403);
    expect(exchange).not.toHaveBeenCalled();
    const finalized = await fetch(callback, { redirect: 'manual', headers: { cookie } });
    await finalized.text();
    expect(finalized.status).toBe(302);
    expect(finalized.headers.get('location')).toBe(redirect);
    expect(finalized.headers.getSetCookie().join(';')).toContain('accessToken=synthetic-access');
    expect(finalized.headers.get('location')).not.toContain('__enfyra_oauth_nonce');
    expect(exchange).toHaveBeenCalledTimes(1);
  });
});
