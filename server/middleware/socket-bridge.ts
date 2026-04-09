import type { IncomingMessage } from 'node:http';
import { defineEventHandler } from 'h3';
import { useRuntimeConfig } from 'nitropack/runtime/internal/config';
import { Server as EngineServer } from 'engine.io';
import { WebSocket } from 'ws';

import {
  resolveSocketBridgeAuth,
  sendSocketBridgeAuthError,
} from '../utils/socket-bridge-auth';
import { stripWsNs, addWsNs } from '../utils/ws-namespace';

let engine: EngineServer | null = null;

function getWsUrl() {
  const api = String(useRuntimeConfig().public.apiUrl ?? '').replace(
    /\/+$/,
    '',
  );
  return api.replace(/^http/, 'ws');
}

type EngineSocket = {
  send: (data: string | Buffer) => void;
  close: () => void;
  on: (ev: string, fn: (...args: unknown[]) => void) => void;
  request: IncomingMessage;
};

function startBridge(
  browserSocket: EngineSocket,
  upstreamHeaders: Record<string, string>,
  pendingBrowser: (string | Buffer)[],
): (data: string | Buffer) => void {
  const wsUrl = getWsUrl();
  const upstream = new WebSocket(
    `${wsUrl}/socket.io/?EIO=4&transport=websocket`,
    { headers: upstreamHeaders },
  );
  const buffer: (string | Buffer)[] = [];
  let ready = false;

  const forwardFromBrowser = (data: string | Buffer) => {
    const rewritten = typeof data === 'string' ? '4' + stripWsNs(data) : data;
    if (ready && upstream.readyState === WebSocket.OPEN) {
      upstream.send(rewritten);
    } else {
      buffer.push(rewritten);
    }
  };

  for (const d of pendingBrowser) {
    forwardFromBrowser(d);
  }
  pendingBrowser.length = 0;

  upstream.on('message', (rawData: Buffer | string, isBinary: boolean) => {
    if (isBinary) {
      browserSocket.send(rawData as Buffer);
      return;
    }
    const frame = rawData.toString();
    const type = frame[0];
    if (type === '0') {
      ready = true;
      for (const msg of buffer) {
        upstream.send(msg);
      }
      buffer.length = 0;
    } else if (type === '4') {
      browserSocket.send(addWsNs(frame.slice(1)));
    } else if (type === '2') {
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

  browserSocket.on('close', () => {
    try {
      upstream.close();
    } catch {}
  });

  return forwardFromBrowser;
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

  engine.on('connection', (browserSocket: EngineSocket) => {
    const pendingBrowser: (string | Buffer)[] = [];
    let relay: ((data: string | Buffer) => void) | null = null;

    browserSocket.on('message', (data: string | Buffer) => {
      if (relay) relay(data);
      else pendingBrowser.push(data);
    });

    void (async () => {
      const auth = await resolveSocketBridgeAuth(
        browserSocket.request as IncomingMessage,
      );
      if (!auth.ok) {
        sendSocketBridgeAuthError(browserSocket);
        try {
          browserSocket.close();
        } catch {}
        return;
      }
      relay = startBridge(browserSocket, auth.upstreamHeaders, pendingBrowser);
    })();
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
