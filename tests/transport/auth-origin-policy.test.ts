import { createServer, type Server } from 'node:http';
import { createApp, defineEventHandler, toNodeListener } from 'h3';
import { afterEach, describe, expect, it, vi } from 'vitest';
import cors, { clearCorsCache } from '../../server/middleware/cors';
import { requireValidRedirectUrl } from '../../server/utils/oauth';
import { getValidatedAuthOrigins } from '../../server/utils/auth-origins';

const servers: Server[] = [];
async function listen(server: Server) {
  servers.push(server);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing fixture port');
  return `http://127.0.0.1:${address.port}`;
}
afterEach(async () => {
  await clearCorsCache();
  vi.unstubAllGlobals();
  await Promise.all(servers.splice(0).map(server => new Promise<void>(resolve => {
    server.closeAllConnections(); server.close(() => resolve());
  })));
});

describe('auth-origin policy and public API CORS remain independent', () => {
  it('allows registered auth returns without restricting browser gateway origins and revalidates revocation', async () => {
    let enabled = true;
    const paths: string[] = [];
    const apiUrl = await listen(createServer((req, res) => {
      paths.push(req.url!);
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ data: [{ value: 'https://console.example.test', isEnabled: enabled }] }));
    }));
    vi.stubGlobal('useRuntimeConfig', () => ({ public: { apiUrl } }));
    await clearCorsCache([]);
    await expect(requireValidRedirectUrl('https://console.example.test/login')).resolves.toBe('https://console.example.test/login');
    const url = await listen(createServer(toNodeListener(createApp().use(cors).use(defineEventHandler(() => 'gateway')))));
    const response = await fetch(`${url}/api/v1/chat/completions`, {
      method: 'OPTIONS', headers: { origin: 'https://any-browser.example.test', 'access-control-request-method': 'POST', 'access-control-request-headers': 'authorization, content-type' },
    });
    expect(response.status).toBe(204);
    expect(response.headers.get('access-control-allow-origin')).toBe('*');
    expect(response.headers.get('access-control-allow-credentials')).toBeNull();
    await response.text();
    enabled = false;
    await expect(requireValidRedirectUrl('https://console.example.test/login')).rejects.toMatchObject({ statusCode: 403 });
    expect(paths).toHaveLength(2);
    expect(paths.every(path => path.startsWith('/enfyra_auth_origin?'))).toBe(true);
  });

  it('does not grant a CORS-only origin permission to receive authentication', async () => {
    const apiUrl = await listen(createServer((_req, res) => {
      res.setHeader('content-type', 'application/json'); res.end('{"data":[]}');
    }));
    vi.stubGlobal('useRuntimeConfig', () => ({ public: { apiUrl } }));
    await clearCorsCache(['https://cors-only.example.test']);
    await expect(requireValidRedirectUrl('https://cors-only.example.test/login')).rejects.toMatchObject({ statusCode: 403 });
  });

  it.each([
    { data: [] },
    { data: [{ value: 'https://console.example.test', isEnabled: false }] },
    { data: [{ value: '*', isEnabled: true }] },
    { data: [{ value: 'https://console.example.test/path', isEnabled: true }] },
    { data: [{ value: 'https://user:secret@console.example.test', isEnabled: true }] },
    {},
  ])('does not grant malformed, disabled or absent external origins: %j', async body => {
    const apiUrl = await listen(createServer((_req, res) => {
      res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(body));
    }));
    vi.stubGlobal('useRuntimeConfig', () => ({ public: { apiUrl } }));
    await expect(requireValidRedirectUrl('https://console.example.test/login')).rejects.toMatchObject({ statusCode: 403 });
  });

  it('fails closed on unavailable metadata while preserving same-app recovery', async () => {
    const apiUrl = await listen(createServer((_req, res) => res.writeHead(503).end()));
    vi.stubGlobal('useRuntimeConfig', () => ({ public: { apiUrl } }));
    expect(await getValidatedAuthOrigins()).toEqual({ loaded: false, origins: [] });
    await expect(requireValidRedirectUrl('https://external.example.test/login')).rejects.toMatchObject({ statusCode: 403 });
    const url = await listen(createServer(toNodeListener(createApp().use(defineEventHandler(event => requireValidRedirectUrl(`http://${event.node.req.headers.host}/login`, event))))));
    const response = await fetch(url);
    expect(await response.text()).toBe(`${url}/login`);
  });
});
