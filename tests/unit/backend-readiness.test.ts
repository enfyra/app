import { createBackendReadinessGate } from '../../server/utils/backend-readiness-gate';

describe('backend readiness gate', () => {
  it('coalesces concurrent requests and forwards each business request only once', async () => {
    let attempts = 0;
    const probe = vi.fn(async () => ++attempts >= 3);
    const gate = createBackendReadinessGate(probe, { intervalMs: 1, timeoutMs: 200 });
    const send = vi.fn();
    await Promise.all(Array.from({ length: 5 }, async () => { await gate.wait(); send(); }));
    expect(probe).toHaveBeenCalledTimes(3);
    expect(send).toHaveBeenCalledTimes(5);
  });

  it('times out without forwarding a write or leaving background probes running', async () => {
    const probe = vi.fn(async () => false);
    const gate = createBackendReadinessGate(probe, { intervalMs: 1, timeoutMs: 15 });
    const send = vi.fn();
    await expect(gate.wait().then(send)).rejects.toThrow('Runtime is not ready');
    const calls = probe.mock.calls.length;
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(probe).toHaveBeenCalledTimes(calls);
    expect(send).not.toHaveBeenCalled();
  });

  it('keeps other waiters alive when one client disconnects', async () => {
    let ready = false;
    const gate = createBackendReadinessGate(async () => ready, { intervalMs: 1, timeoutMs: 200 });
    const controller = new AbortController();
    const first = gate.wait(controller.signal);
    const second = gate.wait();
    controller.abort();
    await expect(first).rejects.toMatchObject({ name: 'AbortError' });
    ready = true;
    await expect(second).resolves.toBeUndefined();
  });

  it('cancels a hung probe when the final client disconnects', async () => {
    const probe = vi.fn((signal: AbortSignal) => new Promise<boolean>((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(signal.reason), { once: true });
    }));
    const gate = createBackendReadinessGate(probe, { timeoutMs: 100 });
    const controller = new AbortController();
    const waiting = gate.wait(controller.signal);
    controller.abort();
    await expect(waiting).rejects.toMatchObject({ name: 'AbortError' });
    expect(probe.mock.calls[0]![0].aborted).toBe(true);
  });

  it('rechecks readiness after the short success cache expires', async () => {
    let ready = true;
    const gate = createBackendReadinessGate(async () => ready, { readyTtlMs: 1, timeoutMs: 15, intervalMs: 1 });
    await gate.wait();
    await new Promise(resolve => setTimeout(resolve, 5));
    ready = false;
    await expect(gate.wait()).rejects.toThrow('Runtime is not ready');
    ready = true;
    await expect(gate.wait()).resolves.toBeUndefined();
  });
});
