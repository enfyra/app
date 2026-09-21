import { createServer, get as httpGet, type Server } from 'node:http';
import { createApp, defineEventHandler, toNodeListener } from 'h3';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { proxyToAPI } from '../../app/utils/enfyra/server/proxy';

const servers: Server[] = [];
const clients: AbortController[] = [];
const config = { public: { apiUrl: '' } };
vi.stubGlobal('useRuntimeConfig', () => config);

async function listen(server: Server) {
  servers.push(server);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing test port');
  return `http://127.0.0.1:${address.port}`;
}

async function bridge() {
  const app = createApp().use(defineEventHandler(event => proxyToAPI(event)));
  return listen(createServer(toNodeListener(app)));
}

afterEach(async () => {
  for (const client of clients.splice(0)) client.abort();
  await Promise.all(servers.splice(0).map(server => new Promise<void>(resolve => {
    server.closeAllConnections();
    server.close(() => resolve());
  })));
});

describe('API proxy real transport', () => {
  it('closes a silent upstream when the downstream request disconnects', async () => {
    let entered = false;
    let closed = false;
    config.public.apiUrl = await listen(createServer((_req, res) => {
      entered = true;
      res.once('close', () => { closed = true; });
    }));
    const controller = new AbortController();
    clients.push(controller);
    const request = fetch((await bridge()) + '/api/v1/chat/completions', { signal: controller.signal }).catch(() => undefined);
    await vi.waitFor(() => expect(entered).toBe(true));
    controller.abort();
    await request;
    await vi.waitFor(() => expect(closed).toBe(true), { timeout: 500 });
  });

  it('closes an active upstream stream when the client stops reading', async () => {
    let closed = false;
    config.public.apiUrl = await listen(createServer((_req, res) => {
      res.writeHead(200, { 'content-type': 'text/event-stream' });
      res.write('data: first\n\n');
      res.once('close', () => { closed = true; });
    }));
    const controller = new AbortController();
    clients.push(controller);
    const response = await fetch((await bridge()) + '/api/v1/chat/completions', { signal: controller.signal });
    const reader = response.body!.getReader();
    expect(new TextDecoder().decode((await reader.read()).value)).toBe('data: first\n\n');
    controller.abort();
    await vi.waitFor(() => expect(closed).toBe(true), { timeout: 500 });
    reader.releaseLock();
  });

  it('preserves status, cookies, redirects, query, headers, and raw request bytes', async () => {
    let received: { url?: string; body?: string; pat?: string } = {};
    config.public.apiUrl = await listen(createServer(async (req, res) => {
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(Buffer.from(chunk));
      received = { url: req.url, body: Buffer.concat(chunks).toString(), pat: String(req.headers['x-enfyra-pat']) };
      res.writeHead(307, { location: '/next', 'set-cookie': ['a=one; Path=/', 'b=two; Path=/'], 'content-type': 'application/octet-stream' });
      res.end(Buffer.from([0, 1, 255]));
    }));
    const response = await fetch((await bridge()) + '/api/v1/chat/completions?test=1', { method: 'POST', headers: { 'x-enfyra-pat': 'synthetic' }, body: '{"raw":"unchanged"}', redirect: 'manual' });
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('/next');
    expect(response.headers.getSetCookie()).toEqual(['a=one; Path=/', 'b=two; Path=/']);
    expect([...new Uint8Array(await response.arrayBuffer())]).toEqual([0, 1, 255]);
    expect(received).toEqual({ url: '/v1/chat/completions?test=1', body: '{"raw":"unchanged"}', pat: 'synthetic' });
  });
  it('does not drain an unbounded response while the downstream socket is paused', async () => {
    let produced = 0;
    let stopped = false;
    const chunk = Buffer.alloc(64 * 1024, 120);
    config.public.apiUrl = await listen(createServer((_req, res) => {
      res.writeHead(200, { 'content-type': 'application/octet-stream' });
      const pump = () => {
        while (!stopped && produced < 1024) {
          produced++;
          if (!res.write(chunk)) { res.once('drain', pump); return; }
        }
        if (produced === 1024) res.end();
      };
      res.once('close', () => { stopped = true; });
      pump();
    }));
    const url = await bridge();
    const client = httpGet(url + '/api/v1/stream', response => response.pause());
    client.on('error', () => {});
    try {
      await new Promise(resolve => setTimeout(resolve, 200));
      expect(produced).toBeGreaterThan(0);
      expect(produced).toBeLessThan(1024);
    } finally {
      client.destroy();
      await vi.waitFor(() => expect(stopped).toBe(true));
    }
  });

  it('preserves an empty upstream response without leaving the proxy open', async () => {
    config.public.apiUrl = await listen(createServer((_req, res) => {
      res.writeHead(204, { 'x-fixture': 'empty' });
      res.end();
    }));
    const response = await fetch((await bridge()) + '/api/v1/empty');
    expect(response.status).toBe(204);
    expect(response.headers.get('x-fixture')).toBe('empty');
    expect(await response.text()).toBe('');
  });

});
