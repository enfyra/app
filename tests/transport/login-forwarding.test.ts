import { createServer, type Server } from 'node:http';
import { createApp, toNodeListener } from 'h3';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../server/utils/oauth', () => ({
  requireValidPostLoginRedirectUrl: vi.fn(async () => undefined),
  requireValidRedirectUrl: vi.fn(async () => 'https://app.example.com'),
  requireValidCookieBridgePrefix: vi.fn(() => undefined),
  requireValidOAuthState: vi.fn(() => undefined),
}));
vi.mock('../../server/utils/oauth-browser-state', () => ({ createOAuthBrowserBinding: vi.fn(() => 'https://app.example.com') }));
vi.mock('../../server/utils/auth-cookies', () => ({ setAuthCookies: vi.fn() }));
import login from '../../server/api/login.post';
import api from '../../server/api/[...]';

const servers: Server[] = [];
async function listen(server: Server) {
  servers.push(server);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing test address');
  return `http://127.0.0.1:${address.port}`;
}
afterEach(async () => {
  for (const server of servers.splice(0)) await new Promise<void>(resolve => { server.closeAllConnections(); server.close(() => resolve()); });
  vi.unstubAllGlobals();
});

describe('Login forwarding transport', () => {
  it.each(['/api/auth/google?redirect=https://app.example.com', '/api/auth/google/callback?code=test'])('preserves the peer on OAuth path %s', async path => {
    let forwarded: string | string[] | undefined;
    const apiUrl = await listen(createServer((req, res) => {
      forwarded = req.headers['x-forwarded-for'];
      res.writeHead(302, { location: 'https://app.example.com' });
      res.end();
    }));
    vi.stubGlobal('useRuntimeConfig', () => ({ public: { apiUrl } }));
    const url = await listen(createServer(toNodeListener(createApp().use(api))));
    const response = await fetch(url + path, { redirect: 'manual', headers: { 'x-forwarded-for': '198.51.100.20' } });
    expect(response.status).toBe(302);
    await response.text();
    expect(forwarded).toBe('198.51.100.20, 127.0.0.1');
  });
  it('preserves client provenance on the dedicated login route', async () => {
    let forwarded: string | string[] | undefined;
    const apiUrl = await listen(createServer((req, res) => {
      forwarded = req.headers['x-forwarded-for'];
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ accessToken: 'access', refreshToken: 'refresh', expTime: 123 }));
    }));
    vi.stubGlobal('useRuntimeConfig', () => ({ public: { apiUrl } }));
    const url = await listen(createServer(toNodeListener(createApp().use(login))));
    const response = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': '198.51.100.20' }, body: JSON.stringify({ email: 'test@example.com', password: 'test' }) });
    expect(response.status).toBe(200);
    await response.text();
    expect(forwarded).toBe('198.51.100.20, 127.0.0.1');
  });
});
