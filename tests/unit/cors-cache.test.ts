import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  clearCorsCache,
  evaluateCorsOrigin,
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

describe('CORS origin decision', () => {
  it('allows a request without an Origin header and grants no CORS', () => {
    expect(
      evaluateCorsOrigin(undefined, 'api.test', { loaded: false, origins: [] }),
    ).toEqual({ allowed: true, corsOrigin: null });
  });

  it('treats the request host as same-origin and grants no CORS', () => {
    expect(
      evaluateCorsOrigin('https://api.test', 'api.test', {
        loaded: true,
        origins: ['https://a.test'],
      }),
    ).toEqual({ allowed: true, corsOrigin: null });
  });

  it('denies a cross-origin request while the allow-list is not loaded', () => {
    expect(
      evaluateCorsOrigin('https://a.test', 'api.test', {
        loaded: false,
        origins: [],
      }),
    ).toEqual({ allowed: false, corsOrigin: null });
  });

  it('denies cross-origin when the loaded allow-list has no entries', () => {
    expect(
      evaluateCorsOrigin('https://a.test', 'api.test', {
        loaded: true,
        origins: [],
      }),
    ).toEqual({ allowed: false, corsOrigin: null });
  });

  it('echoes the configured entry for a listed origin', () => {
    expect(
      evaluateCorsOrigin('https://a.test', 'api.test', {
        loaded: true,
        origins: ['https://a.test'],
      }),
    ).toEqual({ allowed: true, corsOrigin: 'https://a.test' });
  });

  it('denies an origin that is not listed', () => {
    expect(
      evaluateCorsOrigin('https://b.test', 'api.test', {
        loaded: true,
        origins: ['https://a.test'],
      }),
    ).toEqual({ allowed: false, corsOrigin: null });
  });
});
