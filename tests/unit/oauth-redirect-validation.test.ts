import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearCorsCache } from '../../server/middleware/cors';

vi.mock('../../server/middleware/cors', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../server/middleware/cors')>();
  return {
    ...actual,
    getValidatedOrigins: vi.fn(),
  };
});

import { getValidatedOrigins } from '../../server/middleware/cors';
import {
  requireValidOAuthState,
  requireValidPostLoginRedirectUrl,
  requireValidRedirectUrl,
} from '../../server/utils/oauth';

const mockedGetValidatedOrigins = vi.mocked(getValidatedOrigins);

const mockEvent = {
  node: { req: { headers: { host: 'myapp.com' }, socket: { encrypted: true, remoteAddress: '198.51.100.1' } } },
} as any;

describe('OAuth redirect origin validation', () => {
  afterEach(() => {
    vi.clearAllMocks();
    clearCorsCache();
  });

  it('rejects redirect to origin not in cors allowlist', async () => {
    mockedGetValidatedOrigins.mockResolvedValue({
      origins: ['https://app.example.com'],
      timestamp: Date.now(),
      loaded: true,
    });

    await expect(
      requireValidRedirectUrl('https://evil.com/steal')
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('accepts redirect to origin in cors allowlist', async () => {
    mockedGetValidatedOrigins.mockResolvedValue({
      origins: ['https://app.example.com'],
      timestamp: Date.now(),
      loaded: true,
    });

    const result = await requireValidRedirectUrl(
      'https://app.example.com/dashboard'
    );
    expect(result).toBe('https://app.example.com/dashboard');
  });

  it('falls back to same-origin when cors cache not loaded', async () => {
    mockedGetValidatedOrigins.mockResolvedValue({
      origins: [],
      timestamp: 0,
      loaded: false,
    });

    const result = await requireValidRedirectUrl(
      'https://myapp.com/login',
      mockEvent
    );
    expect(result).toBe('https://myapp.com/login');
  });

  it('keeps same-app login redirects usable with a restrictive external allowlist', async () => {
    mockedGetValidatedOrigins.mockResolvedValue({
      origins: ['https://app.example.com'], timestamp: Date.now(), loaded: true,
    });
    await expect(requireValidRedirectUrl('https://myapp.com/settings', mockEvent)).resolves.toBe('https://myapp.com/settings');
    await expect(requireValidPostLoginRedirectUrl('/settings', mockEvent)).resolves.toBe('https://myapp.com/settings');
  });

  it('rejects cross-origin redirect when cors cache not loaded', async () => {
    mockedGetValidatedOrigins.mockResolvedValue({
      origins: [],
      timestamp: 0,
      loaded: false,
    });

    await expect(
      requireValidRedirectUrl('https://evil.com/callback', mockEvent)
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it.each([false, true])('does not allow arbitrary redirects without an app request when loaded=%s', async loaded => {
    mockedGetValidatedOrigins.mockResolvedValue({ origins: [], timestamp: 0, loaded });
    await expect(requireValidRedirectUrl('https://evil.com/return')).rejects.toMatchObject({ statusCode: 403 });
  });

  it('does not trust forwarded host for same-app redirect recovery', async () => {
    mockedGetValidatedOrigins.mockResolvedValue({ origins: [], timestamp: 0, loaded: false });
    const event = { node: { req: { headers: { host: 'myapp.com', 'x-forwarded-host': 'evil.com', 'x-forwarded-proto': 'https' }, socket: { remoteAddress: '127.0.0.1' } } } } as any;
    await expect(requireValidRedirectUrl('https://evil.com/return', event)).rejects.toMatchObject({ statusCode: 403 });
  });

  it('still rejects invalid protocol regardless of cors state', async () => {
    mockedGetValidatedOrigins.mockResolvedValue({
      origins: ['https://app.example.com'],
      timestamp: Date.now(),
      loaded: true,
    });

    await expect(
      requireValidRedirectUrl('javascript:alert(1)')
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('resolves and validates a relative post-login redirect', async () => {
    mockedGetValidatedOrigins.mockResolvedValue({
      origins: [],
      timestamp: 0,
      loaded: false,
    });

    await expect(
      requireValidPostLoginRedirectUrl('/settings/routes', mockEvent)
    ).resolves.toBe('https://myapp.com/settings/routes');
  });

  it('rejects an unsafe post-login redirect protocol', async () => {
    mockedGetValidatedOrigins.mockResolvedValue({
      origins: [],
      timestamp: 0,
      loaded: false,
    });

    await expect(
      requireValidPostLoginRedirectUrl('javascript:alert(1)', mockEvent)
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('accepts multiple allowed origins', async () => {
    mockedGetValidatedOrigins.mockResolvedValue({
      origins: ['https://app.example.com', 'https://admin.example.com'],
      timestamp: Date.now(),
      loaded: true,
    });

    const result = await requireValidRedirectUrl(
      'https://admin.example.com/settings'
    );
    expect(result).toBe('https://admin.example.com/settings');
  });

  it('preserves a valid opaque OAuth state', () => {
    expect(requireValidOAuthState('opaque-state+/= referral')).toBe(
      'opaque-state+/= referral'
    );
  });

  it('rejects a non-string or oversized OAuth state', () => {
    expect(() => requireValidOAuthState(['state'])).toThrow();
    expect(() => requireValidOAuthState('x'.repeat(4097))).toThrow();
  });
});
