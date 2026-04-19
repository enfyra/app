import {
  createError,
  defineEventHandler,
  getQuery,
  getRequestHeader,
  readBody,
  setResponseHeaders,
  type H3Event,
} from 'h3';
import { clearCorsCache } from '../middleware/cors';

type ProxyOptions = {
  method: 'POST' | 'PATCH' | 'DELETE';
  path: string;
};

export function createCorsOriginProxyHandler({ method, path }: ProxyOptions) {
  return defineEventHandler(async (event) => {
    const config = useRuntimeConfig();
    const apiUrl = (config.public as any).apiUrl;

    if (!apiUrl) {
      throw createError({ statusCode: 500, message: 'API URL not configured' });
    }

    const params = event.context.params || {};
    const resolvedPath = path.replace(/:(\w+)/g, (_, key) => {
      const v = (params as Record<string, string>)[key];
      return v ? encodeURIComponent(v) : '';
    });

    const queryEntries = Object.entries(getQuery(event) || {}).filter(
      ([, v]) => v !== undefined && v !== null,
    );
    const queryString = queryEntries.length
      ? `?${queryEntries
          .map(
            ([k, v]) =>
              `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`,
          )
          .join('&')}`
      : '';

    const targetUrl = `${apiUrl.replace(/\/+$/, '')}${resolvedPath}${queryString}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const authHeader =
      (event.context.proxyHeaders as Record<string, string> | undefined)
        ?.authorization || getRequestHeader(event, 'authorization');
    if (authHeader) headers['Authorization'] = authHeader;

    const cookie = getRequestHeader(event, 'cookie');
    if (cookie) headers['cookie'] = cookie;

    const init: RequestInit = { method, headers };
    if (method !== 'DELETE') {
      const body = await readBody(event).catch(() => undefined);
      if (body !== undefined) init.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(targetUrl, init);
      const text = await response.text();
      const data = text ? safeJson(text) : null;

      if (response.ok) {
        await clearCorsCache();
      }

      setResponseHeaders(event, { 'Content-Type': 'application/json' });
      event.node.res.statusCode = response.status;
      return data ?? text;
    } catch (error: any) {
      throw createError({
        statusCode: 502,
        message: error?.message || 'Failed to proxy request to backend',
      });
    }
  });
}

function safeJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
