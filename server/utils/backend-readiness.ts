import { createError, setHeader, type H3Event } from 'h3';
import { BACKEND_READINESS_TIMEOUT_MS } from '~/constants/enfyra';
import { createBackendReadinessGate } from './backend-readiness-gate';
import type { BackendReadinessGate } from '../types/backend-readiness';

let backend: { url: string; timeoutMs: number; gate: BackendReadinessGate } | undefined;

function gateFor(baseUrl: string, timeoutMs: number) {
  const url = `${baseUrl.replace(/\/+$/, '')}/health/ready`;
  if (backend?.url === url && backend.timeoutMs === timeoutMs) return backend.gate;
  const gate = createBackendReadinessGate(async (signal) => {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.any([signal, AbortSignal.timeout(2_000)]),
        redirect: 'manual',
        headers: { accept: 'application/json' },
      });
      if (!response.ok) {
        await response.body?.cancel();
        return false;
      }
      const body = await response.json();
      return body.ready === true && body.code === 'RUNTIME_READY';
    } catch {
      signal.throwIfAborted();
      return false;
    }
  }, { timeoutMs });
  backend = { url, timeoutMs, gate };
  return gate;
}

export async function waitForBackend(
  event: H3Event,
  baseUrl: string,
  timeoutMs = BACKEND_READINESS_TIMEOUT_MS,
): Promise<void> {
  if (!baseUrl) throw createError({ statusCode: 503, message: 'Backend is not configured' });
  const controller = new AbortController();
  const onClose = () => controller.abort();
  event.node.res.once('close', onClose);
  event.node.req.once('aborted', onClose);
  if (event.node.req.aborted || event.node.res.destroyed) controller.abort();
  try {
    await gateFor(baseUrl, timeoutMs).wait(controller.signal);
  } catch {
    if (controller.signal.aborted) throw createError({ statusCode: 499, message: 'Request canceled' });
    setHeader(event, 'Retry-After', 1);
    setHeader(event, 'Cache-Control', 'no-store');
    throw createError({
      statusCode: 503,
      message: 'Your project is still starting or temporarily unavailable. Please try again.',
      data: { code: 'RUNTIME_NOT_READY' },
    });
  } finally {
    event.node.res.off('close', onClose);
    event.node.req.off('aborted', onClose);
  }
}
