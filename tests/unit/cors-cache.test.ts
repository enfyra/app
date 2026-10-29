import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  clearCorsCache,
  evaluateCorsOrigin,
  getValidatedOrigins,
  initCorsCache,
  normalizeAllowedOrigin,
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
    expect(evaluateCorsOrigin(undefined, { loaded: false, origins: [] })).toEqual(
      { allowed: true, corsOrigin: null },
    );
  });

  it('denies a cross-origin request while the allow-list is not loaded', () => {
    expect(
      evaluateCorsOrigin('https://a.test', { loaded: false, origins: [] }),
    ).toEqual({ allowed: false, corsOrigin: null });
  });

  it('grants public CORS when the allow-list is empty', () => {
    expect(
      evaluateCorsOrigin('https://a.test', { loaded: true, origins: [] }),
    ).toEqual({ allowed: true, corsOrigin: '*' });
  });

  it('grants the configured entry for a listed origin', () => {
    expect(
      evaluateCorsOrigin('https://a.test', {
        loaded: true,
        origins: ['https://a.test'],
      }),
    ).toEqual({ allowed: true, corsOrigin: 'https://a.test' });
  });

  it('denies an origin that is not listed', () => {
    expect(
      evaluateCorsOrigin('https://b.test', {
        loaded: true,
        origins: ['https://a.test'],
      }),
    ).toEqual({ allowed: false, corsOrigin: null });
  });

  it('drops entries that are not absolute http(s) origins', () => {
    expect(
      ['https://a.test', 'null', 'a.test', 'file:///etc/passwd', 'https://a.test/path']
        .map((value) => normalizeAllowedOrigin(value)),
    ).toEqual(['https://a.test', null, null, null, 'https://a.test']);
  });
});
