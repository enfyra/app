import { BlockList, isIP } from 'node:net';
import type { IncomingMessage } from 'node:http';
import type { TLSSocket } from 'node:tls';

const proxyPeers = new BlockList();
proxyPeers.addSubnet('127.0.0.0', 8);
proxyPeers.addSubnet('10.0.0.0', 8);
proxyPeers.addSubnet('172.16.0.0', 12);
proxyPeers.addSubnet('192.168.0.0', 16);
proxyPeers.addAddress('::1', 'ipv6');
proxyPeers.addSubnet('fc00::', 7, 'ipv6');

export function getAppRequestOrigin(req: IncomingMessage): string | null {
  const host = req.headers?.host;
  if (typeof host !== 'string' || !host || /[\s/\\@?#]/.test(host)) return null;
  const socket = (req.socket ?? req.connection) as TLSSocket | undefined;
  let protocol = socket?.encrypted ? 'https' : 'http';
  const peer = socket?.remoteAddress?.replace(/^::ffff:/, '') ?? '';
  const family = isIP(peer);
  const forwardedProtocol = req.headers['x-forwarded-proto'];
  // Forwarding is transport metadata only on the controlled private ingress hop.
  if (!socket?.encrypted && family && proxyPeers.check(peer, family === 6 ? 'ipv6' : 'ipv4') && forwardedProtocol !== undefined) {
    if (forwardedProtocol !== 'https' && forwardedProtocol !== 'http') return null;
    protocol = forwardedProtocol;
  }
  try {
    return new URL(`${protocol}://${host}`).origin;
  } catch {
    return null;
  }
}

export function isSameAppOrigin(req: IncomingMessage): boolean {
  const origin = req.headers?.origin;
  return typeof origin === 'string' && origin === getAppRequestOrigin(req);
}
