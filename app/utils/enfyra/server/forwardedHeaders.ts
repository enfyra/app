import type { IncomingMessage } from 'node:http';
import { encodeClientContext } from './clientContext';

export function buildForwardedHeaders(req: IncomingMessage): Record<string, string> {
  const headers = req?.headers ?? {};
  const peer = req?.socket?.remoteAddress ?? 'unknown';
  let chain: string;
  if (headers['x-forwarded-for'] !== undefined) {
    chain = typeof headers['x-forwarded-for'] === 'string' ? headers['x-forwarded-for'] : 'unknown';
  } else if (headers.forwarded !== undefined) {
    chain = typeof headers.forwarded === 'string' ? headers.forwarded.split(',').slice(-64).map(entry => {
      const values = entry.split(';').map(part => part.trim()).filter(part => /^for=/i.test(part));
      if (values.length !== 1) return 'unknown';
      const value = values[0]!.slice(4).trim();
      return value.startsWith('"') && value.endsWith('"') ? value.slice(1, -1) : value;
    }).join(', ') : 'unknown';
  } else {
    chain = typeof headers['x-real-ip'] === 'string' ? headers['x-real-ip'] : '';
  }
  const forwarded: Record<string, string> = {
    'x-enfyra-client-context': encodeClientContext(req),
    'x-forwarded-for': chain ? `${chain.split(',').slice(-63).join(',')}, ${peer}` : peer,
  };
  for (const name of ['cf-connecting-ip', 'cf-connecting-ipv6', 'user-agent', 'origin', 'referer']) {
    if (typeof headers[name] === 'string') forwarded[name] = headers[name];
  }
  return forwarded;
}
