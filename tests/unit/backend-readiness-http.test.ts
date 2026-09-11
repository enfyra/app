import { createServer, type Server } from 'node:http';
import { once } from 'node:events';
import { createApp, defineEventHandler, proxyRequest, toNodeListener } from 'h3';
import { waitForBackend } from '../../server/utils/backend-readiness';

describe('backend readiness over HTTP', () => {
  const servers: Server[] = [];

  async function listen(server: Server) {
    servers.push(server);
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Missing test listener');
    return `http://127.0.0.1:${address.port}`;
  }

  afterEach(async () => {
    await Promise.all(servers.splice(0).map(server => new Promise<void>((resolve, reject) => {
      server.close(error => error ? reject(error) : resolve());
      server.closeAllConnections();
    })));
  });

  it('holds a POST before auth and forwards its original body exactly once after readiness', async () => {
    let ready = false;
    let signalProbe!: () => void;
    const probed = new Promise<void>(resolve => { signalProbe = resolve; });
    const writes: string[] = [];
    const upstream = await listen(createServer(async (req, res) => {
      if (req.url === '/health/ready') {
        res.writeHead(ready ? 200 : 503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ready, code: ready ? 'RUNTIME_READY' : 'RUNTIME_NOT_READY' }));
        signalProbe();
        return;
      }
      let body = '';
      for await (const chunk of req) body += chunk;
      writes.push(body);
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ method: req.method, body, cookie: req.headers.cookie }));
    }));
    const authenticate = vi.fn();
    const bridge = createApp();
    bridge.use(defineEventHandler(async event => {
      await waitForBackend(event, upstream);
      authenticate();
      return proxyRequest(event, `${upstream}/records`, { streamRequest: true });
    }));
    const bridgeUrl = await listen(createServer(toNodeListener(bridge)));
    const body = JSON.stringify({ name: 'Cold start write', nested: { value: 42 } });
    const request = fetch(`${bridgeUrl}/api/records`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie: 'session=test-session' },
      body,
    });
    await probed;
    expect(authenticate).not.toHaveBeenCalled();
    expect(writes).toEqual([]);
    ready = true;
    const response = await request;
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ method: 'POST', body, cookie: 'session=test-session' });
    expect(writes).toEqual([body]);
    expect(authenticate).toHaveBeenCalledTimes(1);
  });
});
