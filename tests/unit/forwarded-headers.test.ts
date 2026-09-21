import type { IncomingMessage } from 'node:http';
import { describe, expect, it } from 'vitest';
import { buildForwardedHeaders } from '../../app/utils/enfyra/server/forwardedHeaders';

const build = (headers: Record<string, unknown>, peer = '198.51.100.20') => buildForwardedHeaders({ headers, socket: { remoteAddress: peer } } as unknown as IncomingMessage);

describe('Backend forwarding provenance', () => {
  it('replaces caller-supplied bridge context with the original request metadata', () => {
    const headers = build({
      'x-enfyra-client-context': 'forged',
      'cf-connecting-ip': '198.51.100.20',
      'x-forwarded-for': '198.51.100.20',
      'user-agent': 'fixture-agent',
      authorization: 'Bearer do-not-copy',
      cookie: 'do-not-copy',
      origin: 'https://example.com',
    }, '173.245.48.1');
    const context = JSON.parse(Buffer.from(headers['x-enfyra-client-context']!, 'base64url').toString());
    expect(context).toEqual({ version: 1, peerIp: '173.245.48.1', headers: {
      'cf-connecting-ip': '198.51.100.20', 'x-forwarded-for': '198.51.100.20',
      'user-agent': 'fixture-agent', origin: 'https://example.com',
    } });
  });

  it('bounds the metadata envelope without forwarding secrets or invalid header values', () => {
    const headers = build({ 'user-agent': 'a'.repeat(20000), 'cf-connecting-ip': ['1.1.1.1', '2.2.2.2'] });
    expect(headers['x-enfyra-client-context']!.length).toBeLessThanOrEqual(12288);
    const context = JSON.parse(Buffer.from(headers['x-enfyra-client-context']!, 'base64url').toString());
    expect(context.peerIp).toBe('198.51.100.20');
    expect(context.headers['user-agent']).toBeUndefined();
    expect(context.headers['cf-connecting-ip']).toEqual(['1.1.1.1', '2.2.2.2']);
  });
  it('always appends the observed peer after an untrusted supplied chain', () => {
    expect(build({ 'x-forwarded-for': '1.1.1.1' })['x-forwarded-for']).toBe('1.1.1.1, 198.51.100.20');
  });
  it('preserves the Cloudflare hop and identity for ESV trust evaluation', () => {
    expect(build({ 'x-forwarded-for': '198.51.100.20', 'cf-connecting-ip': '198.51.100.20' }, '173.245.48.1')).toEqual({ 'x-forwarded-for': '198.51.100.20, 173.245.48.1', 'cf-connecting-ip': '198.51.100.20', 'x-enfyra-client-context': expect.any(String) });
  });
  it('preserves IPv6 endpoints in RFC7239 chains', () => {
    expect(build({ forwarded: 'for="[2001:db8::1]:443";proto=https' }, '10.0.0.2')['x-forwarded-for']).toBe('[2001:db8::1]:443, 10.0.0.2');
  });
  it('does not substitute an alternate header after malformed XFF', () => {
    expect(build({ 'x-forwarded-for': ['1.1.1.1'], 'x-real-ip': '2.2.2.2' })['x-forwarded-for']).toBe('unknown, 198.51.100.20');
  });
  it('records the actual peer without existing proxy headers', () => {
    expect(build({})['x-forwarded-for']).toBe('198.51.100.20');
  });
});
