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
const BRIDGE_ENGINE_PATH = '/ws/socket.io/';

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

const UPSTREAM_MAX_RETRIES = 10;
const UPSTREAM_RETRY_BASE = 2000;
const UPSTREAM_RETRY_MAX = 15_000;
const UPSTREAM_BUFFER_CAP = 50;

function isBridgeEngineRequest(url: string | undefined) {
  return url === '/ws/socket.io' || url?.startsWith(BRIDGE_ENGINE_PATH);
}

function safeSend(socket: { send: (data: string | Buffer) => void }, data: string | Buffer) {
  try {
    socket.send(data);
  } catch {}
}

function startBridge(
  browserSocket: EngineSocket,
  pendingBrowser: (string | Buffer)[],
): (data: string | Buffer) => void {
  const wsUrl = getWsUrl();
  const buffer: (string | Buffer)[] = [];
  let upstream: WebSocket | null = null;
  let ready = false;
  let browserClosed = false;
  let hasConnectedOnce = false;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let retryCount = 0;

  async function connectUpstream() {
    if (browserClosed) return;
    ready = false;

    let auth: Awaited<ReturnType<typeof resolveSocketBridgeAuth>>;
    try {
      auth = await resolveSocketBridgeAuth(
        browserSocket.request as IncomingMessage,
      );
    } catch {
      scheduleRetry();
      return;
    }

    if (!auth.ok) {
      sendSocketBridgeAuthError(browserSocket);
      cleanup();
      try { browserSocket.close(); } catch {}
      return;
    }

    const ws = new WebSocket(
      `${wsUrl}/socket.io/?EIO=4&transport=websocket`,
      { headers: auth.upstreamHeaders },
    );
    upstream = ws;

    ws.on('message', (rawData: Buffer | string, isBinary: boolean) => {
      if (upstream !== ws) return;
      if (isBinary) {
        safeSend(browserSocket, rawData as Buffer);
        return;
      }
      const frame = rawData.toString();
      const type = frame[0];
      if (type === '0') {
        ready = true;
        retryCount = 0;
        if (hasConnectedOnce) {
          safeSend(ws, '40/enfyra-admin,');
        }
        hasConnectedOnce = true;
        for (const msg of buffer) {
          safeSend(ws, msg);
        }
        buffer.length = 0;
      } else if (type === '4') {
        safeSend(browserSocket, addWsNs(frame.slice(1)));
      } else if (type === '2') {
        safeSend(ws, '3');
      } else if (type === '1') {
        try { browserSocket.close(); } catch {}
      }
    });

    ws.on('close', () => {
      ready = false;
      if (upstream === ws && !browserClosed) scheduleRetry();
    });

    ws.on('error', () => {});
  }

  function scheduleRetry() {
    if (browserClosed) return;
    if (retryCount >= UPSTREAM_MAX_RETRIES) {
      try { browserSocket.close(); } catch {}
      return;
    }
    const delay = Math.min(
      UPSTREAM_RETRY_BASE * 2 ** retryCount,
      UPSTREAM_RETRY_MAX,
    );
    retryCount++;
    retryTimer = setTimeout(() => {
      if (!browserClosed) void connectUpstream().catch(() => {});
    }, delay);
  }

  function cleanup() {
    browserClosed = true;
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
    if (upstream) {
      try { upstream.close(); } catch {}
      upstream = null;
    }
  }

  const forwardFromBrowser = (data: string | Buffer) => {
    const rewritten = typeof data === 'string' ? '4' + stripWsNs(data) : data;
    if (ready && upstream?.readyState === WebSocket.OPEN) {
      safeSend(upstream, rewritten);
    } else if (buffer.length < UPSTREAM_BUFFER_CAP) {
      buffer.push(rewritten);
    }
  };

  for (const d of pendingBrowser) {
    forwardFromBrowser(d);
  }
  pendingBrowser.length = 0;

  browserSocket.on('close', cleanup);

  void connectUpstream().catch(() => {});

  return forwardFromBrowser;
}

function initEngine(httpServer: ReturnType<typeof import('net').createServer>) {
  engine = new EngineServer({
    cors: {
      origin: true,
      credentials: true,
    },
    transports: ['polling', 'websocket'],
  });

  type UpgradeArgs = Parameters<EngineServer['handleUpgrade']>;
  httpServer.on('upgrade', (req, socket, head) => {
    if (isBridgeEngineRequest(req.url)) {
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
      try {
        const auth = await resolveSocketBridgeAuth(
          browserSocket.request as IncomingMessage,
        );
        if (!auth.ok) {
          sendSocketBridgeAuthError(browserSocket);
          try { browserSocket.close(); } catch {}
          return;
        }
        relay = startBridge(browserSocket, pendingBrowser);
      } catch {
        try { browserSocket.close(); } catch {}
      }
    })();
  });
}

export default defineEventHandler((event) => {
  if (!engine) {
    const server = (event.node.req.socket as any)?.server;
    if (server) initEngine(server);
  }

  if (engine && isBridgeEngineRequest(event.node.req.url || '')) {
    engine.handleRequest(event.node.req as Parameters<EngineServer['handleRequest']>[0], event.node.res);
    return new Promise<void>((resolve) => {
      event.node.res.on('finish', resolve);
    });
  }
});
