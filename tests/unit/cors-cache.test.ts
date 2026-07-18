import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  clearCorsCache,
  getValidatedOrigins,
  initCorsCache,
} from '../../server/middleware/cors';

describe('CORS origin cache', () => {
  afterEach(() => {
    clearCorsCache();
    vi.unstubAllGlobals();
  });

  it('defaults deny when the allowlist cannot be loaded', async () => {
    vi.stubGlobal('useRuntimeConfig', () => ({
      public: { apiUrl: 'https://api.example.test' },
    }));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
    }));

    await initCorsCache();

    await expect(getValidatedOrigins()).resolves.toEqual({
      origins: [],
      timestamp: 0,
      loaded: false,
    });
  });

  it('keeps an intentionally empty loaded allowlist distinct from failure', async () => {
    await clearCorsCache([]);

    const cache = await getValidatedOrigins();
    expect(cache.loaded).toBe(true);
    expect(cache.origins).toEqual([]);
  });
});
