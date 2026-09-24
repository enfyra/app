export interface ForwardedClientContext {
  version: 1;
  peerIp: string;
  headers: Record<string, string | string[]>;
}
