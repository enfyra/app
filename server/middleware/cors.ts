import { createError, defineEventHandler, getRequestHeader, setHeader, setResponseStatus } from "h3";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

interface CorsCache {
  origins: string[];
  timestamp: number;
  loaded: boolean;
}

const CACHE_TTL = 5 * 60 * 1000;
const ERROR_COOLDOWN = 30 * 1000;
const DEFAULT_ALLOWED_HEADERS = 'Content-Type, Authorization, X-Requested-With, X-Correlation-ID, Paddle-Signature, Range';

let cachedCorsData: CorsCache = {
  origins: [],
  timestamp: 0,
  loaded: false,
};
let lastFetchError = 0;

async function fetchAllowedOrigins(): Promise<string[] | null> {
  const markUnavailable = (message: string, error?: unknown): null => {
    lastFetchError = Date.now();
    if (error) {
      console.error(`[CORS] ${message}:`, error);
    } else {
      console.warn(`[CORS] ${message}`);
    }
    return null;
  };

  try {
    const config = useRuntimeConfig();
    const apiUrl = config.public?.apiUrl;

    if (!apiUrl) {
      return markUnavailable('API URL not configured');
    }

    const response = await fetch(`${apiUrl.replace(/\/+$/, '')}/enfyra_cors_origin?fields=value,isEnabled&limit=0`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return markUnavailable(`Failed to fetch origins (${response.status})`);
    }

    const data = await response.json();
    if (!Array.isArray(data?.data)) return markUnavailable('Invalid origin list');
    const origins: string[] = [];
    for (const row of data.data) {
      if (row?.isEnabled === false) continue;
      const origin = normalizeAllowedOrigin(row?.value);
      if (!origin) return markUnavailable('Invalid enabled origin');
      origins.push(origin);
    }
    return origins;
  } catch (error: any) {
    return markUnavailable('Error fetching origins', error?.message || error);
  }
}

export async function getValidatedOrigins(): Promise<CorsCache> {
  const now = Date.now();
  const isCacheExpired = now - cachedCorsData.timestamp > CACHE_TTL;
  const inErrorCooldown = now - lastFetchError < ERROR_COOLDOWN;

  if (isCacheExpired && !inErrorCooldown) {
    const origins = await fetchAllowedOrigins();
    cachedCorsData = origins === null
      ? { origins: [], timestamp: 0, loaded: false }
      : { origins, timestamp: now, loaded: true };
  }

  return cachedCorsData;
}

export async function initCorsCache(): Promise<void> {
  const now = Date.now();
  const origins = await fetchAllowedOrigins();
  if (origins === null) {
    cachedCorsData = { origins: [], timestamp: 0, loaded: false };
    return;
  }
  cachedCorsData = { origins, timestamp: now, loaded: true };
}

export async function clearCorsCache(newOrigins?: string[]) {
  if (newOrigins !== undefined && newOrigins !== null) {
    cachedCorsData = { origins: newOrigins, timestamp: Date.now(), loaded: true };
  } else {
    cachedCorsData = { origins: [], timestamp: 0, loaded: false };
  }
}

export function getCorsOrigins(): string[] {
  return cachedCorsData.origins;
}

/**
 * Only an absolute http(s) origin can be granted, because that is the only
 * shape a browser sends as `Origin`. This rejects the `"null"` origin that any
 * sandboxed iframe or `data:` URL can present.
 */
export function normalizeAllowedOrigin(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    if (!parsed.host) return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

/**
 * The one CORS contract, shared with ESV and the WebSocket bridge.
 *
 * - No Origin header: allowed without CORS.
 * - Allow-list not loaded yet: denied, so a cold cache never grants access.
 * - Allow-list loaded and empty: grant public CORS without credentials.
 * - Allow-list loaded with entries: only an exact entry is granted with credentials.
 */
export function evaluateCorsOrigin(
  origin: string | undefined,
  cors: { loaded: boolean; origins: string[] },
): { allowed: boolean; corsOrigin: string | null } {
  if (!origin) return { allowed: true, corsOrigin: null };
  if (!cors.loaded) return { allowed: false, corsOrigin: null };
  if (cors.origins.length === 0) return { allowed: true, corsOrigin: '*' };
  const corsOrigin = cors.origins.find((entry) => entry === origin) ?? null;
  return corsOrigin
    ? { allowed: true, corsOrigin }
    : { allowed: false, corsOrigin: null };
}

export default defineEventHandler(async (event) => {
  const url = event.path || event.node.req.url || '';

  if (!url.startsWith('/api/')) {
    return;
  }

  const origin = getRequestHeader(event, 'origin');
  if (!origin) {
    return;
  }

  const corsCache = await getValidatedOrigins();
  const decision = evaluateCorsOrigin(origin, corsCache);
  const isPreflight =
    event.method === 'OPTIONS' &&
    getRequestHeader(event, 'access-control-request-method') !== undefined;

  event.context.corsOrigin = decision;

  if (!decision.allowed) {
    console.warn('[CORS] Not allowed:', origin, 'in', corsCache.origins);
    if (isPreflight || !SAFE_METHODS.has(event.method)) {
      setResponseStatus(event, 403);
      return createError({ statusCode: 403, statusMessage: 'Request origin is not allowed' });
    }
    return;
  }

  if (!decision.corsOrigin) {
    return;
  }

  const requestedHeaders = getRequestHeader(event, 'access-control-request-headers');
  setHeader(event, 'Access-Control-Allow-Origin', decision.corsOrigin);
  if (decision.corsOrigin !== '*') {
    setHeader(event, 'Access-Control-Allow-Credentials', 'true');
  }
  setHeader(event, 'Vary', 'Origin');

  if (isPreflight) {
    setHeader(event, 'Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    setHeader(event, 'Access-Control-Allow-Headers', requestedHeaders || DEFAULT_ALLOWED_HEADERS);
    setHeader(event, 'Access-Control-Max-Age', 600);
    setResponseStatus(event, 204);
    return '';
  }
  return undefined;
});
