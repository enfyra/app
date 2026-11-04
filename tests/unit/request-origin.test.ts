import type { IncomingMessage } from 'node:http';
import { describe, expect, it } from 'vitest';
import { getAppRequestOrigin, isSameAppOrigin } from '../../app/utils/enfyra/server/requestOrigin';
import { buildForwardedHeaders } from '../../app/utils/enfyra/server/forwardedHeaders';

function request(headers: Record<string, unknown>, peer = '198.51.100.1', encrypted = false) {
  return { headers, socket: { remoteAddress: peer, encrypted } } as unknown as IncomingMessage;
}

describe('eApp request origin boundary', () => {
  it.each([
    ['localhost:3000', '127.0.0.1', false, undefined, 'http://localhost:3000'],
    ['admin.example.test', '198.51.100.1', true, undefined, 'https://admin.example.test'],
    ['admin.example.test', '127.0.0.1', true, 'http', 'https://admin.example.test'],
    ['admin.example.test', '127.0.0.1', false, 'https', 'https://admin.example.test'],
    ['admin.example.test', '::ffff:172.18.0.1', false, 'https', 'https://admin.example.test'],
    ['admin.example.test', '::1', false, 'https', 'https://admin.example.test'],
    ['admin.example.test', 'fd00::1', false, 'https', 'https://admin.example.test'],
    ['[::1]:3000', '::1', false, undefined, 'http://[::1]:3000'],
    ['admin.example.test', '198.51.100.1', false, 'https', 'http://admin.example.test'],
  ])('resolves %s from peer %s with TLS=%s and forwarded protocol %s', (host, peer, encrypted, forwarded, expected) => {
    expect(getAppRequestOrigin(request({ host, 'x-forwarded-proto': forwarded }, peer, encrypted))).toBe(expected);
  });

  it.each([
    'https://admin.example.test.evil.test',
    'http://admin.example.test',
    'https://admin.example.test:8443',
    'null',
    'https://admin.example.test/path',
  ])('rejects a non-exact origin %s', origin => {
    expect(isSameAppOrigin(request({ host: 'admin.example.test', origin }, '198.51.100.1', true))).toBe(false);
  });

  it.each([undefined, '', 'admin.example.test/evil', 'admin.example.test@evil.test', 'admin.example.test\\evil', 'admin.example.test evil', 'admin.example.test:invalid'])('fails closed for malformed Host %s', host => {
    expect(getAppRequestOrigin(request({ host }))).toBeNull();
  });

  it('never treats forwarded host or fetch metadata as origin authority', () => {
    const req = request({ host: 'admin.example.test', origin: 'https://evil.test', 'x-forwarded-host': 'evil.test', 'x-forwarded-proto': 'https', 'sec-fetch-site': 'same-origin' }, '127.0.0.1');
    expect(isSameAppOrigin(req)).toBe(false);
    expect(buildForwardedHeaders(req).origin).toBe('https://evil.test');
  });

  it.each(['https,http', ['https', 'http']])('rejects ambiguous private-hop forwarded protocol %j', protocol => {
    expect(getAppRequestOrigin(request({ host: 'admin.example.test', 'x-forwarded-proto': protocol }, '127.0.0.1'))).toBeNull();
  });

  it('strips only same-origin forwarding while preserving original diagnostic provenance', () => {
    const req = request({ host: 'admin.example.test', origin: 'https://admin.example.test', 'x-forwarded-proto': 'https' }, '127.0.0.1');
    const headers = buildForwardedHeaders(req);
    expect(headers.origin).toBeUndefined();
    const context = JSON.parse(Buffer.from(headers['x-enfyra-client-context']!, 'base64url').toString());
    expect(context.headers.origin).toBe('https://admin.example.test');
    expect(context.headers.host).toBe('admin.example.test');
    expect(context.peerIp).toBe('127.0.0.1');
  });
});
