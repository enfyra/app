import { defineEventHandler } from 'h3';
import { useRuntimeConfig } from 'nitropack/runtime/internal/config';
import { Server as EngineServer } from 'engine.io';
import { WebSocket } from 'ws';

let engine: EngineServer | null = null;

function getWsUrl() {
  const api = String(useRuntimeConfig().public.apiUrl ?? '').replace(
    /\/+$/,
    '',
  );
  return api.replace(/^http/, 'ws');
}

function initEngine(httpServer: ReturnType<typeof import('net').createServer>) {
  engine = new EngineServer({
    cors: { origin: '*' },
    transports: ['polling', 'websocket'],
  });

  type UpgradeArgs = Parameters<EngineServer['handleUpgrade']>;
  httpServer.on('upgrade', (req, socket, head) => {
    if (req.url?.startsWith('/socket.io/')) {
      engine!.handleUpgrade(
        req as UpgradeArgs[0],
        socket as UpgradeArgs[1],
        head as UpgradeArgs[2],
      );
    }
  });

  engine.on('connection', (browserSocket) => {
    const wsUrl = getWsUrl();
    const reqHeaders = (browserSocket.request as any)?.headers || {};
    const upstreamHeaders: Record<string, string> = {};
    if (reqHeaders.cookie) upstreamHeaders.cookie = reqHeaders.cookie;
    if (reqHeaders.authorization)
      upstreamHeaders.authorization = reqHeaders.authorization;

    const upstream = new WebSocket(
      `${wsUrl}/socket.io/?EIO=4&transport=websocket`,
      { headers: upstreamHeaders },
    );
    const buffer: (string | Buffer)[] = [];
    let ready = false;

    upstream.on('message', (rawData: Buffer | string, isBinary: boolean) => {
      if (isBinary) {
        browserSocket.send(rawData as Buffer);
        return;
      }
      const frame = rawData.toString();
      const type = frame[0];
      if (type === '0') {
        // Engine.IO OPEN from upstream — mark ready, flush buffer
        ready = true;
        for (const msg of buffer) {
          upstream.send(typeof msg === 'string' ? '4' + msg : msg);
        }
        buffer.length = 0;
      } else if (type === '4') {
        // Engine.IO MESSAGE — forward content to browser
        browserSocket.send(frame.slice(1));
      } else if (type === '2') {
        // Engine.IO PING — respond with PONG
        upstream.send('3');
      } else if (type === '1') {
        browserSocket.close();
      }
    });

    upstream.on('close', () => {
      try {
        browserSocket.close();
      } catch {}
    });
    upstream.on('error', () => {
      try {
        browserSocket.close();
      } catch {}
    });

    browserSocket.on('message', (data: string | Buffer) => {
      if (ready && upstream.readyState === WebSocket.OPEN) {
        upstream.send(typeof data === 'string' ? '4' + data : data);
      } else {
        buffer.push(data);
      }
    });

    browserSocket.on('close', () => {
      try {
        upstream.close();
      } catch {}
    });
  });
}

export default defineEventHandler((event) => {
  if (!engine) {
    const server = (event.node.req.socket as any)?.server;
    if (server) initEngine(server);
  }

  if (engine && (event.node.req.url || '').startsWith('/socket.io/')) {
    engine.handleRequest(event.node.req as Parameters<EngineServer['handleRequest']>[0], event.node.res);
    return new Promise<void>((resolve) => {
      event.node.res.on('finish', resolve);
    });
  }
});
