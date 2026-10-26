export interface ProxyDeliveryCause {
  origin: 'upstream' | 'downstream' | 'bridge';
  phase: 'headers' | 'body' | 'response';
  event: 'error' | 'aborted' | 'close';
  elapsedMs: number;
  code?: string;
}

export interface ProxyDeliveryTracker {
  snapshot: ProxyDeliverySnapshot;
  mark(name: string): void;
  failure(origin: ProxyDeliveryCause['origin'], phase: ProxyDeliveryCause['phase'], name: string, error?: unknown): void;
  report(): void;
  chunk(bytes: number): void;
}

export interface ProxyDeliverySnapshot {
  component: 'EnfyraProxyDelivery';
  hop: 'eapp' | 'sdk';
  hopId: string;
  parentHopId?: string;
  parentLinkTrusted: false;
  startedAt: string;
  elapsedMs: number;
  upstreamStatusCode?: number;
  bytes: number;
  chunks: number;
  lastByteMs?: number;
  events: Record<string, number>;
  firstCause?: ProxyDeliveryCause;
  headersSent: boolean;
  writableEnded: boolean;
  writableFinished: boolean;
  destroyed: boolean;
}
