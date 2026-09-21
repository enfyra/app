import type { IncomingMessage } from 'node:http';
import type { ForwardedClientContext } from '../../../types/enfyra/client-context';

const CONTEXT_HEADERS = [
  'x-forwarded-for', 'forwarded', 'x-real-ip', 'cf-connecting-ip', 'cf-connecting-ipv6',
  'host', 'x-forwarded-host', 'x-forwarded-proto', 'x-forwarded-port',
  'origin', 'referer', 'user-agent',
];

export function encodeClientContext(req: IncomingMessage): string {
  const context: ForwardedClientContext = {
    version: 1,
    peerIp: req?.socket?.remoteAddress ?? 'unknown',
    headers: {},
  };
  for (const name of CONTEXT_HEADERS) {
    const value = req?.headers?.[name];
    if (typeof value !== 'string' && !(Array.isArray(value) && value.every(item => typeof item === 'string'))) continue;
    context.headers[name] = value;
    if (Buffer.byteLength(JSON.stringify(context)) > 6144) {
      delete context.headers[name];
      if (['x-forwarded-for', 'forwarded', 'x-real-ip', 'cf-connecting-ip', 'cf-connecting-ipv6'].includes(name)) context.headers[name] = 'unknown';
    }
  }
  return Buffer.from(JSON.stringify(context)).toString('base64url');
}
