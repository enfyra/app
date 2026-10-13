import { randomUUID } from 'node:crypto';
import type { H3Event } from 'h3';
import type { ProxyDeliveryCause, ProxyDeliverySnapshot, ProxyDeliveryTracker } from '../../../../server/types/proxy-delivery';

export const deliveryHopHeader = 'x-enfyra-delivery-hop';

export function beginProxyDelivery(event: H3Event, hop: ProxyDeliverySnapshot['hop']): ProxyDeliveryTracker {
  const start = Date.now();
  const value = event.node.req.headers[deliveryHopHeader];
  const snapshot: ProxyDeliverySnapshot = {
    component: 'EnfyraProxyDelivery', hop, hopId: randomUUID(),
    ...(typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value) ? { parentHopId: value } : {}),
    parentLinkTrusted: false, startedAt: new Date(start).toISOString(), elapsedMs: 0,
    bytes: 0, chunks: 0, events: {}, headersSent: false,
    writableEnded: false, writableFinished: false, destroyed: false,
  };
  const elapsed = () => Math.max(0, Date.now() - start);
  const mark = (name: string) => { snapshot.events[name] ??= elapsed(); };
  const failure = (origin: ProxyDeliveryCause['origin'], phase: ProxyDeliveryCause['phase'], name: string, error?: unknown) => {
    mark(name);
    if (snapshot.firstCause) return;
    let current = error;
    let code: string | undefined;
    for (let depth = 0; current && depth < 4; depth++) {
      const candidate = current as { code?: unknown; cause?: unknown };
      if (typeof candidate.code === 'string' && /^(?:ERR|UND_ERR|E)[A-Z0-9_]{1,64}$/.test(candidate.code)) code = candidate.code;
      current = candidate.cause;
    }
    snapshot.firstCause = { origin, phase, event: name.includes('aborted') ? 'aborted' : name.includes('close') ? 'close' : 'error', elapsedMs: elapsed(), ...(code ? { code } : {}) };
  };
  let reported = false;
  const report = () => {
    if (reported || (!snapshot.firstCause && (!event.node.res.destroyed || event.node.res.writableFinished))) return;
    reported = true;
    Object.assign(snapshot, {
      elapsedMs: elapsed(), headersSent: event.node.res.headersSent,
      writableEnded: event.node.res.writableEnded, writableFinished: event.node.res.writableFinished,
      destroyed: event.node.res.destroyed,
    });
    console.warn('[EnfyraProxyDelivery]', JSON.stringify(snapshot));
  };
  return {
    snapshot, mark, failure, report,
    chunk(bytes: number) {
      if (bytes <= 0) return;
      mark('body_first_byte'); snapshot.lastByteMs = elapsed();
      snapshot.bytes = Math.min(Number.MAX_SAFE_INTEGER, snapshot.bytes + bytes);
      snapshot.chunks = Math.min(Number.MAX_SAFE_INTEGER, snapshot.chunks + 1);
    },
  };
}
