import type { IncomingMessage } from 'node:http';
import { defineEventHandler } from 'h3';
import { useRuntimeConfig } from 'nitropack/runtime/internal/config';
import { Server as EngineServer } from 'engine.io';
import { PacketType } from 'socket.io-parser';
import { WebSocket } from 'ws';

import {
  classifyUpstreamSocketIoPacket,
  resolveSocketBridgeAuth,
  sendSocketBridgeAuthError,
} from '../utils/socket-bridge-auth';
import { isTransientNetworkError } from '../utils/transient-network-error';
import { getValidatedOrigins } from './cors';
import {
  isSocketBridgeOriginAllowed,
  SocketBridgeBuffer,
} from '../utils/socket-bridge-policy';
import {
  getSocketIoNamespace,
  rewriteSocketIoNamespace,
  stripWsNs,
} from '../utils/ws-namespace';

let engine: EngineServer | null = null;
const BRIDGE_ENGINE_PATH = '/ws/socket.io/';

function getWsUrl() {
  const api = String(useRuntimeConfig().public.apiUrl ?? '').replace(
    /\/+$/,
    '',
  );
  return api.replace(/\/api$/, '').replace(/^http/, 'ws');
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
const UPSTREAM_BUFFER_MAX_MESSAGES = 50;
const UPSTREAM_BUFFER_MAX_BYTES = 1024 * 1024;

function ignoreBridgeIoError(_error: unknown) {}

function isBridgeEngineRequest(url: string | undefined) {
  return url === '/ws/socket.io' || url?.startsWith(BRIDGE_ENGINE_PATH);
}

function safeSend(socket: { send: (data: string | Buffer) => void }, data: string | Buffer) {
  try {
    socket.send(data);
  } catch {}
}

function toUpstreamFrame(data: string | Buffer) {
  return typeof data === 'string' ? `4${data}` : data;
}

function startBridge(
  browserSocket: EngineSocket,
  pendingBrowser: SocketBridgeBuffer,
  upstreamHeaders: Record<string, string>,
): (data: string | Buffer) => void {
  const wsUrl = getWsUrl();
  const buffer = new SocketBridgeBuffer(
    UPSTREAM_BUFFER_MAX_MESSAGES,
    UPSTREAM_BUFFER_MAX_BYTES,
  );
  let upstream: WebSocket | null = null;
  let ready = false;
  let browserClosed = false;
  let hasConnectedOnce = false;
  const browserNamespacesByUpstream = new Map<string, string>();
  const connectedNamespacesByUpstream = new Set<string>();
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let retryCount = 0;

  function connectUpstream() {
    if (browserClosed) return;
    ready = false;

    const ws = new WebSocket(
      `${wsUrl}/socket.io/?EIO=4&transport=websocket`,
      { headers: upstreamHeaders },
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
        if (hasConnectedOnce) {
          for (const upstreamNamespace of connectedNamespacesByUpstream) {
            safeSend(ws, `40${upstreamNamespace},`);
          }
        }
        hasConnectedOnce = true;
        for (const msg of buffer.drain()) {
          safeSend(ws, toUpstreamFrame(msg));
        }
      } else if (type === '4') {
        const payload = frame.slice(1);
        const packetStatus = classifyUpstreamSocketIoPacket(payload);
        const packetType = Number(payload[0]);
        const upstreamNamespace = getSocketIoNamespace(payload);
        const browserNamespace = upstreamNamespace
          ? browserNamespacesByUpstream.get(upstreamNamespace)
          : null;
        if (packetStatus === 'auth_error') {
          sendSocketBridgeAuthError(
            browserSocket,
            browserNamespace ?? undefined,
          );
          cleanup();
          try { browserSocket.close(); } catch {}
          return;
        }
        if (packetStatus === 'connected') {
          retryCount = 0;
          if (upstreamNamespace) connectedNamespacesByUpstream.add(upstreamNamespace);
        } else if (
          packetType === PacketType.CONNECT_ERROR &&
          upstreamNamespace
        ) {
          connectedNamespacesByUpstream.delete(upstreamNamespace);
          browserNamespacesByUpstream.delete(upstreamNamespace);
        }
        safeSend(
          browserSocket,
          browserNamespace && browserNamespace !== upstreamNamespace
            ? rewriteSocketIoNamespace(payload, browserNamespace)
            : payload,
        );
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
      if (!browserClosed) connectUpstream();
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
    buffer.clear();
    connectedNamespacesByUpstream.clear();
  }

  const forwardFromBrowser = (data: string | Buffer) => {
    let rewritten = data;
    if (typeof data === 'string') {
      const browserNamespace = getSocketIoNamespace(data);
      rewritten = stripWsNs(data);
      const upstreamNamespace = getSocketIoNamespace(rewritten);
      if (browserNamespace && upstreamNamespace) {
        if (Number(rewritten[0]) === PacketType.DISCONNECT) {
          browserNamespacesByUpstream.delete(upstreamNamespace);
          connectedNamespacesByUpstream.delete(upstreamNamespace);
          if (!ready) return;
        } else {
          browserNamespacesByUpstream.set(upstreamNamespace, browserNamespace);
        }
      }
    }
    if (ready && upstream?.readyState === WebSocket.OPEN) {
      safeSend(upstream, toUpstreamFrame(rewritten));
    } else if (!buffer.push(rewritten)) {
      cleanup();
      try { browserSocket.close(); } catch {}
    }
  };

  for (const d of pendingBrowser.drain()) {
    forwardFromBrowser(d);
  }

  browserSocket.on('close', cleanup);
  browserSocket.on('error', ignoreBridgeIoError);

  connectUpstream();

  return forwardFromBrowser;
}

function initEngine(httpServer: ReturnType<typeof import('net').createServer>) {
  engine = new EngineServer({
    cors: {
      origin: true,
      credentials: true,
    },
    allowRequest: (req, callback) => {
      void getValidatedOrigins()
        .then((cors) => {
          callback(
            null,
            isSocketBridgeOriginAllowed(req.headers.origin, cors),
          );
        })
        .catch(() => callback('Socket origin validation failed', false));
    },
    transports: ['polling', 'websocket'],
  });

  type UpgradeArgs = Parameters<EngineServer['handleUpgrade']>;
  engine.on('connection_error', ignoreBridgeIoError);

  httpServer.on('upgrade', (req, socket, head) => {
    if (isBridgeEngineRequest(req.url)) {
      socket.on('error', ignoreBridgeIoError);
      try {
        engine!.handleUpgrade(
          req as UpgradeArgs[0],
          socket as UpgradeArgs[1],
          head as UpgradeArgs[2],
        );
      } catch (error) {
        if (!isTransientNetworkError(error)) {
          console.error('[Socket Bridge] Upgrade failed:', error);
        }
        socket.destroy();
      }
    }
  });

  engine.on('connection', (browserSocket: EngineSocket) => {
    const pendingBrowser = new SocketBridgeBuffer(
      UPSTREAM_BUFFER_MAX_MESSAGES,
      UPSTREAM_BUFFER_MAX_BYTES,
    );
    let relay: ((data: string | Buffer) => void) | null = null;
    let browserClosed = false;

    browserSocket.on('message', (data: string | Buffer) => {
      if (relay) relay(data);
      else if (!pendingBrowser.push(data)) {
        browserClosed = true;
        pendingBrowser.clear();
        try { browserSocket.close(); } catch {}
      }
    });
    browserSocket.on('close', () => {
      browserClosed = true;
      pendingBrowser.clear();
    });

    void (async () => {
      try {
        const auth = await resolveSocketBridgeAuth(
          browserSocket.request as IncomingMessage,
        );
        if (browserClosed) return;
        if (!auth.ok) {
          sendSocketBridgeAuthError(browserSocket);
          try { browserSocket.close(); } catch {}
          return;
        }
        relay = startBridge(
          browserSocket,
          pendingBrowser,
          auth.upstreamHeaders,
        );
      } catch {
        if (!browserClosed) {
          try { browserSocket.close(); } catch {}
        }
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
    event.node.req.on('error', ignoreBridgeIoError);
    event.node.res.on('error', ignoreBridgeIoError);
    try {
      engine.handleRequest(event.node.req as Parameters<EngineServer['handleRequest']>[0], event.node.res);
    } catch (error) {
      if (!isTransientNetworkError(error)) throw error;
    }
    return new Promise<void>((resolve) => {
      event.node.res.on('finish', resolve);
      event.node.res.on('close', resolve);
    });
  }
});
