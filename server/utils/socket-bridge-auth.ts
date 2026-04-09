import type { IncomingMessage } from 'node:http';
import { $fetch } from 'ofetch';
import { Encoder, PacketType } from 'socket.io-parser';
import { useRuntimeConfig } from 'nitropack/runtime/internal/config';

import {
  ACCESS_TOKEN_KEY,
  ENFYRA_SOCKET_AUTH_ERROR,
  REFRESH_TOKEN_KEY,
} from '~/constants/enfyra';
import { normalizeUrl } from '~/utils/api/url';
import { isAccessTokenExpired } from '~/utils/enfyra/server/refreshToken';

import { addWsNs } from './ws-namespace';

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

async function fetchAccessTokenWithRefresh(
  refreshToken: string,
  apiUrl: string,
): Promise<string | null> {
  try {
    const response = await $fetch<{
      accessToken?: string;
    }>(normalizeUrl(apiUrl, '/auth/refresh-token'), {
      method: 'POST',
      body: { refreshToken },
    });
    return response.accessToken ?? null;
  } catch {
    return null;
  }
}

export async function resolveSocketBridgeAuth(
  req: IncomingMessage,
): Promise<
  { ok: true; upstreamHeaders: Record<string, string> } | { ok: false }
> {
  const authHeader = req.headers?.authorization;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    return {
      ok: true,
      upstreamHeaders: buildUpstreamHeaders(req, { authorization: authHeader }),
    };
  }

  const cookies = parseCookieHeader(req.headers?.cookie);
  const accessToken = cookies[ACCESS_TOKEN_KEY];
  const refreshToken = cookies[REFRESH_TOKEN_KEY];

  if (accessToken && !isAccessTokenExpired(accessToken)) {
    return { ok: true, upstreamHeaders: buildUpstreamHeaders(req, {}) };
  }

  if (refreshToken && (!accessToken || isAccessTokenExpired(accessToken))) {
    const apiUrl = useRuntimeConfig().public?.apiUrl;
    if (typeof apiUrl === 'string' && apiUrl.length > 0) {
      const newAccess = await fetchAccessTokenWithRefresh(refreshToken, apiUrl);
      if (newAccess) {
        return {
          ok: true,
          upstreamHeaders: buildUpstreamHeaders(req, {
            authorization: `Bearer ${newAccess}`,
          }),
        };
      }
    }
  }

  return { ok: false };
}

export function sendSocketBridgeAuthError(browserSocket: {
  send: (data: string) => void;
}) {
  const packs = encoder.encode({
    type: PacketType.CONNECT_ERROR,
    nsp: '/enfyra-admin',
    data: { message: ENFYRA_SOCKET_AUTH_ERROR },
  }) as string[];
  const encoded = packs[0];
  if (!encoded) return;
  browserSocket.send(`4${addWsNs(encoded)}`);
}
