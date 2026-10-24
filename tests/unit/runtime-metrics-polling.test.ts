import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRuntimeMetricsPoller } from '../../app/utils/runtime-monitor/polling';

afterEach(() => {
  vi.useRealTimers();
});

describe('runtime metrics client sampling', () => {
  it('requests one cluster snapshot immediately and every two seconds', async () => {
    vi.useFakeTimers();
    const snapshot = { intervalMs: 2000, instances: [] };
    const load = vi.fn().mockResolvedValue(snapshot);
    const onSample = vi.fn();
    const poller = createRuntimeMetricsPoller({ load, onSample, onError: vi.fn(), onSchedule: vi.fn() });
    try {
      poller.start();
      poller.start();
      await vi.advanceTimersByTimeAsync(0);
      expect(load).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(1999);
      expect(load).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(1);
      expect(load).toHaveBeenCalledTimes(2);
      expect(onSample).toHaveBeenCalledTimes(2);
      poller.stop();
      await vi.advanceTimersByTimeAsync(4000);
      expect(load).toHaveBeenCalledTimes(2);
    } finally { poller.stop(); }
  });

  it('does not overlap slow requests or apply a response after stop', async () => {
    vi.useFakeTimers();
    let resolve: (value: { intervalMs: number; instances: [] }) => void = () => {};
    const load = vi.fn((_signal: AbortSignal) => new Promise<{ intervalMs: number; instances: [] }>((done) => { resolve = done; }));
    const onSample = vi.fn();
    const poller = createRuntimeMetricsPoller({ load, onSample, onError: vi.fn(), onSchedule: vi.fn() });
    try {
      poller.start();
      await vi.advanceTimersByTimeAsync(6000);
      expect(load).toHaveBeenCalledOnce();
      poller.stop();
      expect(load.mock.calls[0]?.[0].aborted).toBe(true);
      resolve({ intervalMs: 2000, instances: [] });
      await vi.advanceTimersByTimeAsync(0);
      expect(onSample).not.toHaveBeenCalled();
      expect(vi.getTimerCount()).toBe(0);
    } finally { poller.stop(); }
  });

  it('keeps request starts two seconds apart despite response latency', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const startedAt: number[] = [];
    const load = vi.fn(() => {
      startedAt.push(Date.now());
      return new Promise<{ intervalMs: number; instances: [] }>((resolve) => {
        setTimeout(() => resolve({ intervalMs: 2000, instances: [] }), 100);
      });
    });
    const poller = createRuntimeMetricsPoller({ load, onSample: vi.fn(), onError: vi.fn(), onSchedule: vi.fn() });
    try {
      poller.start();
      await vi.advanceTimersByTimeAsync(4100);
      expect(startedAt).toEqual([0, 2000, 4000]);
    } finally { poller.stop(); }
  });

  it('retains the two-second retry cadence after a failed request', async () => {
    vi.useFakeTimers();
    const error = new Error('unavailable');
    const load = vi.fn().mockRejectedValueOnce(error).mockResolvedValue({ intervalMs: 2000, instances: [] });
    const onError = vi.fn();
    const onSample = vi.fn();
    const poller = createRuntimeMetricsPoller({ load, onSample, onError, onSchedule: vi.fn() });
    try {
      poller.start();
      await vi.advanceTimersByTimeAsync(0);
      expect(onError).toHaveBeenCalledWith(error);
      await vi.advanceTimersByTimeAsync(2000);
      expect(load).toHaveBeenCalledTimes(2);
      expect(onSample).toHaveBeenCalledOnce();
    } finally { poller.stop(); }
  });

  it('ignores a previous mount response after polling restarts', async () => {
    vi.useFakeTimers();
    let completeOld: (sample: { intervalMs: number; instances: [] }) => void = () => {};
    const current = { intervalMs: 2000, instances: [] };
    const load = vi.fn()
      .mockImplementationOnce(() => new Promise((resolve) => { completeOld = resolve; }))
      .mockResolvedValue(current);
    const onSample = vi.fn();
    const poller = createRuntimeMetricsPoller({ load, onSample, onError: vi.fn(), onSchedule: vi.fn() });
    try {
      poller.start();
      poller.stop();
      poller.start();
      await vi.advanceTimersByTimeAsync(0);
      completeOld(current);
      await vi.advanceTimersByTimeAsync(0);
      expect(onSample).toHaveBeenCalledOnce();
      expect(vi.getTimerCount()).toBe(1);
    } finally { poller.stop(); }
  });
});
