import { defineEventHandler, getRequestHeader, setHeader } from "h3";

interface CorsCache {
  origins: string[];
  timestamp: number;
}

const CACHE_TTL = 5 * 60 * 1000;

let cachedCorsData: CorsCache = {
  origins: [],
  timestamp: 0,
};

async function fetchAllowedOrigins(): Promise<string[]> {
  try {
    const config = useRuntimeConfig();
    const apiUrl = config.public?.apiUrl;
    
    if (!apiUrl) {
      console.warn('[CORS] API URL not configured');
      return [];
    }

    const response = await fetch(`${apiUrl}/setting_definition`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.warn('[CORS] Failed to fetch origins:', response.status);
      return [];
    }

    const data = await response.json();
    let settings = data?.data || data;
    
    if (Array.isArray(settings) && settings.length > 0) {
      settings = settings[0];
    }
    
    const corsOrigins = settings?.corsAllowedOrigins || [];
    
    return Array.isArray(corsOrigins) ? corsOrigins : [];
  } catch (error: any) {
    console.error('[CORS] Error fetching origins:', error.message);
    return [];
  }
}

export async function getValidatedOrigins(): Promise<string[]> {
  const now = Date.now();
  const isCacheExpired = now - cachedCorsData.timestamp > CACHE_TTL;
  
  if (isCacheExpired || cachedCorsData.origins.length === 0) {
    const origins = await fetchAllowedOrigins();
    cachedCorsData = { origins, timestamp: now };
  }
  
  return cachedCorsData.origins;
}

export async function initCorsCache(): Promise<void> {
  const now = Date.now();
  const origins = await fetchAllowedOrigins();
  cachedCorsData = { origins, timestamp: now };
  console.log('[CORS] Cache initialized:', origins);
}

export async function clearCorsCache(newOrigins?: string[]) {
  const oldOrigins = [...cachedCorsData.origins];
  
  if (newOrigins !== undefined && newOrigins !== null) {
    cachedCorsData = { origins: newOrigins, timestamp: Date.now() };
    console.log('[CORS] Cache updated, was:', oldOrigins, 'now:', newOrigins);
  } else {
    cachedCorsData = { origins: [], timestamp: 0 };
    console.log('[CORS] Cache cleared, was:', oldOrigins);
  }
}

export function getCorsOrigins(): string[] {
  return cachedCorsData.origins;
}

export default defineEventHandler(async (event) => {
  const url = event.node.req.url || '';
  const method = event.node.req.method || 'GET';
  
  if (!url.includes('/api/')) {
    return;
  }
  
  const origin = getRequestHeader(event, 'origin');
  
  if (!origin) {
    return;
  }
  
  const allowedOrigins = await getValidatedOrigins();
  
  if (allowedOrigins.length === 0) {
    console.log('[CORS] No origins configured, allowing:', origin);
    setHeader(event, 'Access-Control-Allow-Origin', origin);
    setHeader(event, 'Access-Control-Allow-Credentials', 'true');
    setHeader(event, 'Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    setHeader(event, 'Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    return;
  }
  
  if (allowedOrigins.includes(origin)) {
    setHeader(event, 'Access-Control-Allow-Origin', origin);
    setHeader(event, 'Access-Control-Allow-Credentials', 'true');
    setHeader(event, 'Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    setHeader(event, 'Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  } else {
    console.warn('[CORS] Not allowed:', origin, 'in', allowedOrigins);
  }
});
