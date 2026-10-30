import { createServer, type Server } from 'node:http';
import { createApp, toNodeListener } from 'h3';
import { Server as EngineServer } from 'engine.io';
import { io, type Socket } from 'socket.io-client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ENFYRA_SOCKET_AUTH_ERROR } from '../../app/constants/enfyra';

const config = vi.hoisted(() => ({ public: { apiUrl: '' } }));
const cors = vi.hoisted(() => ({ loaded: true, origins: [] as string[] }));
vi.mock('nitropack/runtime/internal/config', () => ({ useRuntimeConfig: () => config }));
vi.mock('../../server/middleware/cors', async importOriginal => ({
  ...await importOriginal<typeof import('../../server/middleware/cors')>(),
  getValidatedOrigins: async () => cors,
}));

const servers: Server[] = [];
const clients: Socket[] = [];
const engines: EngineServer[] = [];

async function listen(server: Server) {
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing test port');
  return `http://127.0.0.1:${address.port}`;
}

async function createBridge() {
  vi.resetModules();
  const { default: handler } = await import('../../server/middleware/socket-bridge');
  const app = createApp().use(handler);
  const url = await listen(createServer(toNodeListener(app)));
  await fetch(url);
  return url;
}

function connect(url: string, namespace: string, headers: Record<string, string> = {}) {
  const socket = io(`${url}${namespace}`, {
    path: '/ws/socket.io', forceNew: true, extraHeaders: headers,
    reconnectionDelay: 25, reconnectionDelayMax: 50, timeout: 1000,
    auth: { marker: 'original-auth' },
  });
  clients.push(socket);
  return socket;
}

afterEach(async () => {
  cors.loaded = true;
  cors.origins = [];
  for (const client of clients.splice(0)) client.disconnect();
  for (const engine of engines.splice(0)) engine.close();
  await Promise.all(servers.splice(0).map(server => new Promise<void>(resolve => {
    server.closeAllConnections();
    server.close(() => resolve());
  })));
});

describe('socket bridge real transport', () => {
  it.each(['/ws/chat', '/'])('delivers upstream auth rejection on %s without retries', async namespace => {
    const upstreamHttp = createServer();
    const upstream = new EngineServer({ transports: ['websocket'] });
    engines.push(upstream);
    upstream.attach(upstreamHttp, { path: '/socket.io' });
    config.public.apiUrl = await listen(upstreamHttp);
    upstream.on('connection', socket => {
      socket.on('message', () => socket.send(`4${namespace === '/' ? '' : '/chat,'}{"message":"Invalid authentication token","data":{"code":"AUTH_INVALID"}}`));
    });
    const client = connect(await createBridge(), namespace, { 'x-enfyra-pat': 'efy_pat_rejected_fixture' });
    const errors: string[] = [];
    let retries = 0;
    client.on('connect_error', error => errors.push(error.message));
    client.io.on('reconnect_attempt', () => retries++);
    await vi.waitFor(() => expect(errors).toEqual([ENFYRA_SOCKET_AUTH_ERROR]));
    expect(retries).toBe(0);
  });
  it.each(['/ws/enfyra-admin', '/ws/chat', '/chat', '/'])('reports missing auth on %s without parse-error reconnects', async namespace => {
    const url = await createBridge();
    const client = connect(url, namespace);
    const errors: string[] = [];
    const disconnects: string[] = [];
    let retries = 0;
    client.on('connect_error', error => errors.push(error.message));
    client.on('disconnect', reason => disconnects.push(reason));
    client.io.on('reconnect_attempt', () => retries++);
    await vi.waitFor(() => expect(errors).toEqual([ENFYRA_SOCKET_AUTH_ERROR]), { timeout: 2000 });
    expect(disconnects).not.toContain('parse error');
    expect(retries).toBe(0);
  });

  it.each([true, false])('keeps same-origin polling, upgrade and reconnect usable with external policy loaded=%s', async loaded => {
    cors.loaded = loaded;
    cors.origins = ['https://client.example.test'];
    const upstreamHttp = createServer();
    const upstream = new EngineServer({ transports: ['websocket'], allowRequest: (req, callback) => callback(null, !req.headers.origin) });
    engines.push(upstream);
    upstream.attach(upstreamHttp, { path: '/socket.io' });
    config.public.apiUrl = await listen(upstreamHttp);
    upstream.on('connection', socket => {
      socket.on('message', data => {
        if (String(data).startsWith('0/chat,')) socket.send(`0/chat,${JSON.stringify({ sid: socket.id })}`);
      });
    });
    const url = await createBridge();
    const client = connect(url, '/ws/chat', { origin: url, 'x-enfyra-pat': 'efy_pat_transport_fixture' });
    let connects = 0;
    client.on('connect', () => connects++);
    await vi.waitFor(() => expect(connects).toBe(1), { timeout: 2000 });
    await vi.waitFor(() => expect(client.io.engine.transport.name).toBe('websocket'));
    for (const socket of Object.values(upstream.clients)) socket.transport.close();
    await vi.waitFor(() => expect(connects).toBe(2), { timeout: 4000 });
  });

  it('rejects unlisted origins and forwarding spoofing on polling and websocket upgrades', async () => {
    cors.origins = ['https://client.example.test'];
    const url = await createBridge();
    const headers = { origin: 'https://evil.example.test', 'x-forwarded-host': 'evil.example.test', 'x-forwarded-proto': 'https' };
    const response = await fetch(`${url}/ws/socket.io/?EIO=4&transport=polling`, { headers });
    expect(response.status).toBe(403);
    expect(response.headers.get('access-control-allow-origin')).toBeNull();
    await response.text();
    const { WebSocket } = await import('ws');
    const ws = new WebSocket(`${url.replace('http:', 'ws:')}/ws/socket.io/?EIO=4&transport=websocket`, { headers });
    const rejection = await new Promise<{ status: number; body: string }>((resolve, reject) => {
      ws.once('unexpected-response', (_req, res) => {
        let body = '';
        res.on('data', chunk => { body += String(chunk); });
        res.on('end', () => { ws.terminate(); resolve({ status: res.statusCode!, body }); });
      });
      ws.once('open', () => { ws.close(); reject(new Error('Unexpected cross-origin upgrade')); });
      ws.on('error', () => {});
    });
    expect(rejection).toEqual({ status: 400, body: 'Forbidden' });
  });

  it('reconnects through the client after upstream loss and preserves auth', async () => {
    const upstreamHttp = createServer();
    const upstream = new EngineServer({ transports: ['websocket'] });
    engines.push(upstream);
    upstream.attach(upstreamHttp, { path: '/socket.io' });
    config.public.apiUrl = await listen(upstreamHttp);
    const received: string[] = [];
    upstream.on('connection', socket => {
      socket.on('message', data => {
        const packet = String(data);
        received.push(packet);
        if (packet.startsWith('0/chat,')) socket.send(`0/chat,${JSON.stringify({ sid: socket.id })}`);
      });
    });
    const url = await createBridge();
    const client = connect(url, '/ws/chat', { 'x-enfyra-pat': 'efy_pat_transport_fixture' });
    let connects = 0;
    const disconnects: string[] = [];
    client.on('connect', () => connects++);
    client.on('disconnect', reason => disconnects.push(reason));
    await vi.waitFor(() => expect(connects).toBe(1));
    await vi.waitFor(() => expect(client.io.engine.transport.name).toBe('websocket'));
    for (const socket of Object.values(upstream.clients)) socket.transport.close();
    await vi.waitFor(() => expect(connects).toBe(2), { timeout: 4000 });
    expect(disconnects).toEqual(['transport close']);
    expect(received.filter(packet => packet.startsWith('0/chat,'))).toEqual([
      '0/chat,{"marker":"original-auth"}',
      '0/chat,{"marker":"original-auth"}',
    ]);
  });
});
