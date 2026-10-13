import { createServer, type Server } from 'node:http';
import { createApp, defineEventHandler, toNodeListener } from 'h3';
import { Agent, getGlobalDispatcher, setGlobalDispatcher } from 'undici';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { proxyToAPI } from '../../app/utils/enfyra/server/proxy';

const servers: Server[] = [];
const clients: AbortController[] = [];
const config = { public: { apiUrl: '' } };
vi.stubGlobal('useRuntimeConfig', () => config);
let warn: ReturnType<typeof vi.spyOn>;
let dispatcher: Agent | undefined;
const previousDispatcher = getGlobalDispatcher();
const clientDispatcher = new Agent({ headersTimeout: 10_000, bodyTimeout: 10_000 });
const clientFetch = (url: string, options?: RequestInit) => fetch(url, { ...options, dispatcher: clientDispatcher } as RequestInit);

async function listen(server: Server) {
  servers.push(server);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  return `http://127.0.0.1:${(server.address() as { port: number }).port}`;
}

async function bridge() {
  return listen(createServer(toNodeListener(createApp().use(defineEventHandler(event => proxyToAPI(event))))));
}

function records() {
  return warn.mock.calls.filter(call => call[0] === '[EnfyraProxyDelivery]').map(call => JSON.parse(String(call[1])) as Record<string, any>);
}

beforeEach(() => { warn = vi.spyOn(console, 'warn').mockImplementation(() => {}); });
afterAll(() => clientDispatcher.destroy());
afterEach(async () => {
  clients.splice(0).forEach(client => client.abort());
  setGlobalDispatcher(previousDispatcher);
  await Promise.all(servers.splice(0).map(server => new Promise<void>(resolve => {
    server.closeAllConnections(); server.close(() => resolve());
  })));
  await dispatcher?.destroy(); dispatcher = undefined;
  warn.mockRestore();
});

describe('private proxy delivery diagnostics', () => {
  it('generates its own hop ID, retains only a bounded parent link and stays silent on success', async () => {
    let hop: string | undefined;
    const parent = '46f9cacd-e79f-46b4-8cae-78d207ced765';
    config.public.apiUrl = await listen(createServer((req, res) => {
      hop = req.headers['x-enfyra-delivery-hop'] as string;
      res.setHeader('x-enfyra-delivery-hop', String(hop));
      res.end('chào 👋');
    }));
    const response = await clientFetch((await bridge()) + '/api/v1/chat/completions?private=query', { headers: { 'x-enfyra-delivery-hop': parent } });
    expect(await response.text()).toBe('chào 👋');
    expect(hop).toMatch(/^[0-9a-f-]{36}$/);
    expect(hop).not.toBe(parent);
    expect(response.headers.has('x-enfyra-delivery-hop')).toBe(false);
    expect(records()).toEqual([]);
  });

  it('retains the headers timeout before downstream teardown without a user abort', async () => {
    dispatcher = new Agent({ headersTimeout: 50 }); setGlobalDispatcher(dispatcher);
    config.public.apiUrl = await listen(createServer(() => {}));
    const response = await clientFetch((await bridge()) + '/api/v1/chat/completions?private=query', { headers: { authorization: 'Bearer private-credential' } });
    expect(response.status).toBe(502); await response.text();
    expect(records()).toHaveLength(1);
    expect(records()[0]).toMatchObject({ component: 'EnfyraProxyDelivery', hop: 'eapp', firstCause: { origin: 'upstream', phase: 'headers', code: 'UND_ERR_HEADERS_TIMEOUT' } });
    expect(JSON.stringify(records())).not.toMatch(/private|Bearer|http:\/\/|\/v1\//);
  });

  it('retains source body timeout before pipeline closes the destination', async () => {
    dispatcher = new Agent({ bodyTimeout: 50 }); setGlobalDispatcher(dispatcher);
    config.public.apiUrl = await listen(createServer((_req, res) => { res.writeHead(200); res.write('private-output'); }));
    await expect(clientFetch((await bridge()) + '/api/v1/chat/completions').then(response => response.text())).rejects.toThrow();
    await vi.waitFor(() => expect(records()).toHaveLength(1));
    expect(records()[0]).toMatchObject({ firstCause: { origin: 'upstream', phase: 'body', code: 'UND_ERR_BODY_TIMEOUT' }, upstreamStatusCode: 200, bytes: 14, chunks: 1 });
    expect(records()[0].events.source_error).toBeLessThanOrEqual(records()[0].events.response_close);
    expect(JSON.stringify(records())).not.toContain('private-output');
  });

  it('retains genuine downstream cancellation and rejects malformed linkage', async () => {
    let entered = false;
    config.public.apiUrl = await listen(createServer(() => { entered = true; }));
    const controller = new AbortController(); clients.push(controller);
    const request = clientFetch((await bridge()) + '/api/v1/chat/completions', { signal: controller.signal, headers: { 'x-enfyra-delivery-hop': 'private-forged-link' } }).catch(() => null);
    await vi.waitFor(() => expect(entered).toBe(true)); controller.abort(); await request;
    await vi.waitFor(() => expect(records()).toHaveLength(1));
    expect(records()[0].firstCause.origin).toBe('downstream');
    expect(records()[0].parentHopId).toBeUndefined();
    expect(JSON.stringify(records())).not.toContain('private-forged-link');
  });
});
