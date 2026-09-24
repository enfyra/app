import { setTimeout as delay } from 'node:timers/promises';
import type { BackendReadinessGate, BackendReadinessOptions } from '../types/backend-readiness';

export function createBackendReadinessGate(
  probe: (signal: AbortSignal) => Promise<boolean>,
  { timeoutMs = 30_000, intervalMs = 500, readyTtlMs = 1_000 }: BackendReadinessOptions = {},
): BackendReadinessGate {
  let readyUntil = 0;
  let flight: { controller: AbortController; promise: Promise<void>; waiters: number } | undefined;

  function start() {
    const controller = new AbortController();
    const current = { controller, promise: Promise.resolve(), waiters: 0 };
    const deadline = setTimeout(() => controller.abort(new Error('Runtime is not ready')), timeoutMs);
    current.promise = (async () => {
      while (true) {
        controller.signal.throwIfAborted();
        if (await probe(controller.signal)) {
          controller.signal.throwIfAborted();
          readyUntil = Date.now() + readyTtlMs;
          return;
        }
        await delay(intervalMs, undefined, { signal: controller.signal });
      }
    })().catch((error: unknown) => {
      throw controller.signal.aborted ? controller.signal.reason : error;
    }).finally(() => {
      clearTimeout(deadline);
      if (flight === current) flight = undefined;
    });
    flight = current;
    return current;
  }

  return {
    async wait(signal) {
      signal?.throwIfAborted();
      if (Date.now() < readyUntil) return;
      const current = flight && !flight.controller.signal.aborted ? flight : start();
      current.waiters += 1;
      return new Promise<void>((resolve, reject) => {
        let settled = false;
        const finish = (error?: unknown) => {
          if (settled) return;
          settled = true;
          signal?.removeEventListener('abort', abort);
          current.waiters -= 1;
          if (!current.waiters) current.controller.abort();
          if (error) reject(error);
          else resolve();
        };
        const abort = () => finish(signal?.reason ?? new DOMException('Request canceled', 'AbortError'));
        signal?.addEventListener('abort', abort, { once: true });
        current.promise.then(() => finish(), finish);
        if (signal?.aborted) abort();
      });
    },
  };
}
