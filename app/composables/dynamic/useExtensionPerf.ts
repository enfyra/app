const ENABLED = typeof window !== "undefined" && typeof URLSearchParams !== "undefined" && new URLSearchParams(window.location.search).get("perf") === "1";

function mark(name: string) {
  if (ENABLED && performance?.mark) {
    performance.mark(`ext-perf-${name}`);
  }
}

function measure(name: string, start: string, end?: string) {
  if (!ENABLED || !performance?.measure) return 0;
  try {
    const endMark = end ? `ext-perf-${end}` : undefined;
    const measureName = `ext-perf-${name}`;
    const m = performance.measure(measureName, `ext-perf-${start}`, endMark);
    const ms = m.duration;
    if (import.meta.dev) {
      console.log(`[Extension Perf] ${name}: ${ms.toFixed(1)}ms`);
    }
    return ms;
  } catch {
    return 0;
  }
}

export function useExtensionPerf() {
  const start = (label: string) => {
    mark(label);
    return () => measure(label, label);
  };

  const time = async <T>(label: string, fn: () => Promise<T>): Promise<T> => {
    const startMark = `${label}-start`;
    mark(startMark);
    try {
      return await fn();
    } finally {
      measure(label, startMark);
    }
  };

  const timeSync = <T>(label: string, fn: () => T): T => {
    const startMark = `${label}-start`;
    mark(startMark);
    try {
      return fn();
    } finally {
      measure(label, startMark);
    }
  };

  const log = (message: string, data?: Record<string, unknown>) => {
    if (ENABLED && import.meta.dev) {
      console.log(`[Extension Perf] ${message}`, data ?? "");
    }
  };

  return { mark, measure, start, time, timeSync, log, enabled: ENABLED };
}
