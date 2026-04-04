import { WebSocket } from 'ws';

const getBackendUrl = () =>
  (useRuntimeConfig().public.apiUrl as string)?.replace(/\/+$/, '') ||
  'http://localhost:1105';

export default defineEventHandler({
  handler: async (event) => {
    const backendUrl = getBackendUrl();
    if (!backendUrl) {
      console.error('[socket.io proxy] API_URL not configured');
      return;
    }
    const reqUrl = event.node.req.url || '';
    const targetUrl = `${backendUrl}${reqUrl}`;
    return proxyRequest(event, targetUrl, {
      headers: { ...event.context.proxyHeaders },
    });
  },

  websocket: {
    open(peer) {
      const apiUrl = getBackendUrl();
      const wsUrl = apiUrl.replace(/^http/, 'ws');

      let targetPath = '/socket.io/';
      try {
        const reqUrl = peer.request?.url || '/socket.io/';
        const parsed = new URL(reqUrl, 'http://localhost');
        targetPath = parsed.pathname + parsed.search;
      } catch {}

      const headers: Record<string, string> = {};
      const peerHeaders = peer.request?.headers;
      if (peerHeaders) {
        for (const key of ['authorization', 'cookie']) {
          const val =
            typeof peerHeaders.get === 'function'
              ? peerHeaders.get(key)
              : (peerHeaders as any)[key];
          if (val) headers[key] = String(val);
        }
      }

      const upstream = new WebSocket(`${wsUrl}${targetPath}`, { headers });

      upstream.on('open', () => {
        peer.context.upstream = upstream;
        const buffer = peer.context.buffer as any[] | undefined;
        if (buffer) {
          for (const msg of buffer) upstream.send(msg);
          peer.context.buffer = undefined;
        }
      });

      upstream.on('message', (data: Buffer | string, isBinary: boolean) => {
        try {
          peer.send(isBinary ? data : data.toString());
        } catch {}
      });

      upstream.on('close', () => {
        try {
          peer.close();
        } catch {}
      });

      upstream.on('error', (err: Error) => {
        console.error('[socket.io ws proxy] upstream error:', err.message);
        try {
          peer.close();
        } catch {}
      });
    },

    message(peer, message) {
      const upstream = peer.context.upstream as WebSocket | undefined;
      const raw = message.rawData;

      // crossws delivers rawData as Buffer even for text frames.
      // Engine.IO text packets start with a digit (0x30-0x36 = '0'-'6').
      // Binary attachments (Socket.IO BINARY_EVENT) are raw binary and don't
      // start with an ASCII digit, so we can use the first byte to decide.
      let payload: string | Buffer;
      if (Buffer.isBuffer(raw)) {
        const first = raw[0] ?? 0;
        payload = first >= 0x30 && first <= 0x36 ? raw.toString() : raw;
      } else if (raw instanceof ArrayBuffer || ArrayBuffer.isView(raw)) {
        const buf = Buffer.from(raw as ArrayBuffer);
        const first = buf[0] ?? 0;
        payload = first >= 0x30 && first <= 0x36 ? buf.toString() : buf;
      } else {
        payload = String(raw);
      }

      if (upstream?.readyState === WebSocket.OPEN) {
        upstream.send(payload);
      } else {
        if (!peer.context.buffer) peer.context.buffer = [];
        (peer.context.buffer as any[]).push(payload);
      }
    },

    close(peer) {
      const upstream = peer.context.upstream as WebSocket | undefined;
      try {
        upstream?.close();
      } catch {}
    },

    error(peer) {
      const upstream = peer.context.upstream as WebSocket | undefined;
      try {
        upstream?.close();
      } catch {}
    },
  },
});
