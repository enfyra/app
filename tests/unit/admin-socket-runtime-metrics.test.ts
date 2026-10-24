import { computed, ref } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAdminSocket } from '../../app/composables/shared/useAdminSocket';
import { mockNuxtImport } from '@nuxt/test-utils/runtime';

mockNuxtImport('useNotify', () => () => ({}));
mockNuxtImport('useSchema', () => () => ({}));
mockNuxtImport('useTableCatalog', () => () => ({}));
mockNuxtImport('useRoutes', () => () => ({}));
mockNuxtImport('useMenuApi', () => () => ({}));
mockNuxtImport('useDynamicComponent', () => () => ({}));
mockNuxtImport('useGlobalExtensions', () => () => ({}));

const { socket, io } = vi.hoisted(() => {
  const socket = { connected: true, on: vi.fn(), emit: vi.fn(), timeout: vi.fn(), get volatile() { return this; }, io: { on: vi.fn() } };
  socket.timeout.mockReturnValue(socket);
  return { socket, io: vi.fn(() => socket) };
});
vi.mock('socket.io-client', () => ({ io }));

beforeEach(() => {
  vi.useFakeTimers();
  socket.connected = true;
  socket.emit.mockReset();
  vi.stubGlobal('ref', ref);
  vi.stubGlobal('computed', computed);
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('admin socket runtime snapshot transport', () => {
  it('requests one cluster snapshot by acknowledgement without registering a push listener', async () => {
    const admin = useAdminSocket();
    const snapshot = { intervalMs: 2000, instances: [{ instance: { id: 'a' } }, { instance: { id: 'b' } }] };
    socket.emit.mockImplementation((_event, _payload, ack) => ack(null, { success: true, data: snapshot }));
    await expect(admin.loadRuntimeMetrics(new AbortController().signal)).resolves.toEqual(snapshot);
    expect(socket.emit).toHaveBeenCalledWith('$system:runtime:metrics:get', {}, expect.any(Function));
    expect(socket.on).not.toHaveBeenCalledWith('$system:runtime:metrics', expect.any(Function));
  });

  it('rejects disconnected requests without buffering an emit for reconnect', async () => {
    const admin = useAdminSocket();
    socket.connected = false;
    await expect(admin.loadRuntimeMetrics(new AbortController().signal)).rejects.toThrow('not connected');
    expect(socket.emit).not.toHaveBeenCalled();
  });

  it('rejects a cancelled request and ignores its later acknowledgement', async () => {
    const admin = useAdminSocket();
    const controller = new AbortController();
    const pending = admin.loadRuntimeMetrics(controller.signal);
    const rejected = expect(pending).rejects.toThrow('cancelled');
    controller.abort();
    await rejected;
    const ack = socket.emit.mock.calls[0]?.[2];
    ack(null, { success: true, data: { intervalMs: 2000, instances: [] } });
    await expect(pending).rejects.toThrow('cancelled');
  });

  it('bounds a lost acknowledgement to ten seconds', async () => {
    const admin = useAdminSocket();
    socket.emit.mockImplementation((_event, _payload, ack) => {
      setTimeout(() => ack(new Error('operation has timed out')), 10000);
    });
    const rejected = expect(admin.loadRuntimeMetrics(new AbortController().signal)).rejects.toThrow('timed out');
    await vi.advanceTimersByTimeAsync(10000);
    await rejected;
    expect(socket.timeout).toHaveBeenCalledWith(10000);
  });
});
