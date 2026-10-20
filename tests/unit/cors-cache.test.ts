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
  it('allows a request without an Origin header', () => {
    expect(evaluateCorsOrigin(undefined, { loaded: false, origins: [] })).toBe(
      true,
    );
  });

  it('denies a cross-origin request while the allow-list is not loaded', () => {
    expect(
      evaluateCorsOrigin('https://a.test', { loaded: false, origins: [] }),
    ).toBe(false);
  });

  it('allows every origin when the loaded allow-list is empty', () => {
    expect(
      evaluateCorsOrigin('https://a.test', { loaded: true, origins: [] }),
    ).toBe(true);
  });

  it('allows only listed origins once the allow-list has entries', () => {
    const policy = { loaded: true, origins: ['https://a.test'] };
    expect(evaluateCorsOrigin('https://a.test', policy)).toBe(true);
    expect(evaluateCorsOrigin('https://b.test', policy)).toBe(false);
  });
});
