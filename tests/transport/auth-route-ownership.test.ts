import { createServer, type Server } from 'node:http';
import { createApp, toNodeListener } from 'h3';
import { $fetch } from 'ofetch';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../server/utils/oauth', () => ({
  requireValidCookieBridgePrefix: () => undefined, requireValidOAuthState: () => undefined,
  requireValidRedirectUrl: async (redirect: string) => redirect, buildUrlWithQuery: (url: string) => url,
}));
import { bindOAuthBrowserRedirect } from '../../server/utils/oauth-browser-state';
vi.mock('../../server/middleware/cors', () => ({ clearCorsCache: vi.fn() }));
import api from '../../server/api/[...]';
import { createCorsOriginProxyHandler } from '../../server/utils/cors-origin-proxy';
const servers: Server[] = [];
async function listen(server: Server) {
  servers.push(server); await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address(); if (!address || typeof address === 'string') throw new Error('No address');
  return `http://127.0.0.1:${address.port}`;
}
afterEach(async () => {
  for (const server of servers.splice(0)) await new Promise<void>(resolve => { server.closeAllConnections(); server.close(() => resolve()); });
  vi.unstubAllGlobals();
});
describe('bridge route ownership', () => {
  it.each(['/api/auth/SET-COOKIES', '/api/AUTH/set-cookies/', '/API/auth/set-cookies'])('does not proxy the cookie finalizer alias %s without browser binding', async path => {
    let upstreamCalls = 0;
    const apiUrl = await listen(createServer((_req, res) => { upstreamCalls++; res.end('{}'); }));
    vi.stubGlobal('useRuntimeConfig', () => ({ public: { apiUrl } }));
    const url = await listen(createServer(toNodeListener(createApp().use(api))));
    const response = await fetch(url + path + '?code=synthetic&redirect=https://app.invalid/return');
    await response.text();
    expect(upstreamCalls).toBe(0); expect(response.status).toBe(403);
  });

  it.each(['/api/AUTH/%73et-cookies', '/api/auth%2fset-cookies', '/api/%61uth/set-cookies'])('does not proxy the percent-encoded cookie finalizer alias %s', async path => {
    let upstreamCalls = 0;
    const apiUrl = await listen(createServer((_req, res) => {
      upstreamCalls++;
      res.setHeader('content-type', 'application/json');
      res.setHeader('set-cookie', 'accessToken=synthetic-access; Path=/; HttpOnly');
      res.end(JSON.stringify({ accessToken: 'synthetic-access', refreshToken: 'synthetic-refresh', expTime: 9999999999 }));
    }));
    vi.stubGlobal('useRuntimeConfig', () => ({ public: { apiUrl } }));
    const url = await listen(createServer(toNodeListener(createApp().use(api))));
    const response = await fetch(url + path + '?code=synthetic&redirect=https://app.invalid/return', { redirect: 'manual' });
    await response.text();
    expect(upstreamCalls).toBe(0);
    expect(response.headers.get('set-cookie')).toBeNull();
    expect(response.status).toBe(403);
  });
  it('exchanges a matching browser-bound alias through the finalizer and sets auth cookies', async () => {
    let exchangePath = '';
    const apiUrl = await listen(createServer((req, res) => {
      exchangePath = req.url ?? '';
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ accessToken: 'synthetic-access', refreshToken: 'synthetic-refresh', expTime: 9999999999 }));
    }));
    vi.stubGlobal('useRuntimeConfig', () => ({ public: { apiUrl } }));
    vi.stubGlobal('$fetch', $fetch);
    const url = await listen(createServer(toNodeListener(createApp().use(api))));
    const redirect = bindOAuthBrowserRedirect('https://app.invalid/return', 'synthetic-nonce');
    const response = await fetch(`${url}/api/auth/SET-COOKIES?code=synthetic&redirect=${encodeURIComponent(redirect)}`, {
      redirect: 'manual', headers: { cookie: 'enfyra_oauth_nonce=synthetic-nonce' },
    });
    await response.text();
    expect(response.status).toBe(302);
    expect(exchangePath).toBe('/auth/oauth/exchange');
    expect(response.headers.get('location')).toBe('https://app.invalid/return');
    expect(response.headers.get('set-cookie')).toContain('accessToken=synthetic-access');
  });
  it('preserves native PAT on the dedicated CORS mutation bridge', async () => {
    let credential: string | string[] | undefined;
    const apiUrl = await listen(createServer((req, res) => { credential = req.headers['x-enfyra-pat']; res.setHeader('content-type', 'application/json'); res.end('{}'); }));
    vi.stubGlobal('useRuntimeConfig', () => ({ public: { apiUrl } }));
    const url = await listen(createServer(toNodeListener(createApp().use(createCorsOriginProxyHandler({ method: 'POST', path: '/enfyra_cors_origin' })))));
    const response = await fetch(url, { method: 'POST', headers: { 'x-enfyra-pat': 'synthetic-pat', 'content-type': 'application/json' }, body: '{}' });
    await response.text(); expect(credential).toBe('synthetic-pat');
  });
});
