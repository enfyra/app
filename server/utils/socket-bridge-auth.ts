import type { IncomingMessage } from 'node:http';
import { Encoder, PacketType } from 'socket.io-parser';

import {
  ACCESS_TOKEN_KEY,
  ENFYRA_SOCKET_AUTH_ERROR,
} from '~/constants/enfyra';
import { isAccessTokenExpired } from '~/utils/enfyra/server/refreshToken';

const encoder = new Encoder();

function parseCookieHeader(header: string | undefined): Record<string, string> {
  if (!header) return {};
  const out: Record<string, string> = {};
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    try {
      out[key] = decodeURIComponent(val);
    } catch {
      out[key] = val;
    }
  }
  return out;
}

function buildUpstreamHeaders(
  req: IncomingMessage,
  extra: Record<string, string>,
): Record<string, string> {
  const upstreamHeaders: Record<string, string> = { ...extra };
  const cookie = req.headers?.cookie;
  if (typeof cookie === 'string') upstreamHeaders.cookie = cookie;
  return upstreamHeaders;
}

export async function resolveSocketBridgeAuth(
  req: IncomingMessage,
): Promise<
  { ok: true; upstreamHeaders: Record<string, string> } | { ok: false }
> {
  const authHeader = req.headers?.authorization;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    const accessToken = authHeader.slice('Bearer '.length);
    if (isAccessTokenExpired(accessToken)) return { ok: false };
    return {
      ok: true,
      upstreamHeaders: buildUpstreamHeaders(req, { authorization: authHeader }),
    };
  }

  const cookies = parseCookieHeader(req.headers?.cookie);
  const accessToken = cookies[ACCESS_TOKEN_KEY];

  if (accessToken && !isAccessTokenExpired(accessToken)) {
    return { ok: true, upstreamHeaders: buildUpstreamHeaders(req, {}) };
  }

  return { ok: false };
}

export function classifyUpstreamSocketIoPacket(
  packet: string,
): 'connected' | 'auth_error' | 'other' {
  const packetType = Number(packet[0]);
  if (packetType === PacketType.CONNECT) return 'connected';
  if (packetType !== PacketType.CONNECT_ERROR) return 'other';

  const commaIndex = packet.indexOf(',');
  const payload = packet.slice(commaIndex === -1 ? 1 : commaIndex + 1);
  try {
    const error = JSON.parse(payload) as {
      message?: unknown;
      code?: unknown;
      data?: { code?: unknown };
    };
    const message = typeof error.message === 'string' ? error.message : '';
    const code = error.data?.code ?? error.code;
    if (
      code === 'AUTH_INVALID' ||
      code === 'AUTH_REQUIRED' ||
      message.includes('Invalid authentication token') ||
      message.includes('Authentication token required') ||
      message.includes(ENFYRA_SOCKET_AUTH_ERROR)
    ) {
      return 'auth_error';
    }
  } catch {}

  return 'other';
}

export function sendSocketBridgeAuthError(browserSocket: {
  send: (data: string) => void;
}, namespace = '/ws/enfyra-admin') {
  const browserNamespace = namespace.startsWith('/') ? namespace : `/${namespace}`;
  const packs = encoder.encode({
    type: PacketType.CONNECT_ERROR,
    nsp: browserNamespace,
    data: { message: ENFYRA_SOCKET_AUTH_ERROR },
  }) as string[];
  const encoded = packs[0];
  if (!encoded) return;
  browserSocket.send(`4${encoded}`);
}
