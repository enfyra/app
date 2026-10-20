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
    const rows = Array.isArray(data?.data) ? data.data : [];

    return rows
      .filter((row: any) => row?.isEnabled !== false && typeof row?.value === 'string')
      .map((row: any) => row.value.trim())
      .filter((v: string) => v.length > 0);
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
    if (origins !== null) {
      cachedCorsData = { origins, timestamp: now, loaded: true };
    }
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
 * The one CORS contract, shared with ESV and the WebSocket bridge.
 *
 * - No Origin header: allowed.
 * - Allow-list not loaded yet: denied, so a cold cache never grants access.
 * - Allow-list loaded and empty: every origin is allowed.
 * - Allow-list loaded and non-empty: the origin must be listed.
 */
export function evaluateCorsOrigin(
  origin: string | undefined,
  cors: { loaded: boolean; origins: string[] },
): boolean {
  if (!origin) return true;
  if (!cors.loaded) return false;
  return cors.origins.length === 0 || cors.origins.includes(origin);
}

export default defineEventHandler(async (event) => {
  const url = event.node.req.url || '';

  if (!url.includes('/api/')) {
    return;
  }

  const origin = getRequestHeader(event, 'origin');
  if (!origin) {
    return;
  }

  const corsCache = await getValidatedOrigins();
  const allowed = evaluateCorsOrigin(origin, corsCache);
  const isPreflight =
    event.method === 'OPTIONS' &&
    getRequestHeader(event, 'access-control-request-method') !== undefined;

  event.context.corsOrigin = { origin, allowed };

  if (!allowed) {
    console.warn('[CORS] Not allowed:', origin, 'in', corsCache.origins);
    if (isPreflight || !SAFE_METHODS.has(event.method)) {
      setResponseStatus(event, 403);
      return createError({ statusCode: 403, statusMessage: 'Request origin is not allowed' });
    }
    return;
  }

  const requestedHeaders = getRequestHeader(event, 'access-control-request-headers');
  setHeader(event, 'Access-Control-Allow-Origin', origin);
  setHeader(event, 'Access-Control-Allow-Credentials', 'true');
  setHeader(event, 'Vary', 'Origin');

  if (isPreflight) {
    setHeader(event, 'Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    setHeader(event, 'Access-Control-Allow-Headers', requestedHeaders || DEFAULT_ALLOWED_HEADERS);
    setHeader(event, 'Access-Control-Max-Age', 600);
    setResponseStatus(event, 204);
    return '';
  }
});
