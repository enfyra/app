import { describe, expect, it } from 'vitest';
import { normalizeAuthOrigin } from '../../app/utils/auth-origin';

describe('auth origin input normalization', () => {
  it.each([
    ['https://console.example.test', 'https://console.example.test'],
    [' HTTPS://CONSOLE.EXAMPLE.TEST:443/ ', 'https://console.example.test'],
    ['http://localhost:3000', 'http://localhost:3000'],
    ['http://127.0.0.1:3000', 'http://127.0.0.1:3000'],
    ['http://[::1]:3000', 'http://[::1]:3000'],
  ])('normalizes %s to %s', (input, expected) => {
    expect(normalizeAuthOrigin(input)).toBe(expected);
  });
  it.each(['*', 'null', '//evil.test', 'javascript:alert(1)', 'https://u:p@evil.test', 'https://example.test/path', 'https://example.test?x=1', 'https://example.test#fragment', 'file:///etc/passwd', ''])('rejects %s', value => {
    expect(normalizeAuthOrigin(value)).toBeNull();
  });
});
