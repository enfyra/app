import type { RuntimeMetricsPollingOptions } from '~/types/runtime-monitor';

export const RUNTIME_METRICS_POLL_INTERVAL_MS = 2000;

export function createRuntimeMetricsPoller(options: RuntimeMetricsPollingOptions) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let controller: AbortController | null = null;
  let running = false;
  let generation = 0;

  async function sample(run: number) {
    const startedAt = Date.now();
    const request = new AbortController();
    controller = request;
    options.onSchedule(null);
    try {
      const snapshot = await options.load(request.signal);
      if (running && generation === run) options.onSample(snapshot);
    } catch (error) {
      if (running && generation === run) options.onError(error);
    } finally {
      if (running && generation === run) {
        controller = null;
        const elapsed = Date.now() - startedAt;
        const delay = RUNTIME_METRICS_POLL_INTERVAL_MS - elapsed % RUNTIME_METRICS_POLL_INTERVAL_MS;
        options.onSchedule(Date.now() + delay);
        timer = setTimeout(() => {
          timer = null;
          void sample(run);
        }, delay);
      }
    }
  }

  function start() {
    if (running) return;
    running = true;
    void sample(++generation);
  }

  function stop() {
    running = false;
    generation++;
    if (timer) clearTimeout(timer);
    timer = null;
    controller?.abort();
    controller = null;
    options.onSchedule(null);
  }

  return { start, stop };
}
