import { normalizeAuthOrigin } from '~/utils/auth-origin';
import type { AuthOriginPolicy } from '../types/auth-origin';

export async function getValidatedAuthOrigins(): Promise<AuthOriginPolicy> {
  try {
    const apiUrl = useRuntimeConfig().public.apiUrl;
    if (!apiUrl) return { loaded: false, origins: [] };
    const response = await fetch(`${apiUrl.replace(/\/+$/, '')}/enfyra_auth_origin?fields=value,isEnabled&limit=0`, {
      signal: AbortSignal.timeout(5000),
      headers: { accept: 'application/json' },
    });
    if (!response.ok) return { loaded: false, origins: [] };
    const body: unknown = await response.json();
    if (!body || typeof body !== 'object' || !('data' in body) || !Array.isArray(body.data)) {
      return { loaded: false, origins: [] };
    }
    const origins: string[] = [];
    for (const row of body.data as unknown[]) {
      if (!row || typeof row !== 'object' || !('value' in row)) return { loaded: false, origins: [] };
      if ('isEnabled' in row && row.isEnabled === false) continue;
      const origin = normalizeAuthOrigin(row.value);
      if (!origin) return { loaded: false, origins: [] };
      origins.push(origin);
    }
    return { loaded: true, origins };
  } catch {
    return { loaded: false, origins: [] };
  }
}
