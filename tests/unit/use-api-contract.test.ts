import { computed, ref, toRaw, toValue, unref } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useApi } from '../../app/composables/shared/useApi';

const { fetch, notify } = vi.hoisted(() => ({ fetch: vi.fn(), notify: { error: vi.fn() } }));
vi.mock('#build/fetch', () => ({ $fetch: fetch }));
vi.mock('~/composables/shared/useNotify', () => ({ useNotify: () => notify }));
vi.mock('~/composables/shared/useCodeVersion', () => ({ useCodeVersion: () => ({ confirm: vi.fn() }) }));
vi.mock('~/composables/shared/useDatabase', () => ({ useDatabase: () => ({ getIdFieldName: () => 'id' }) }));

beforeEach(() => {
  fetch.mockReset();
  notify.error.mockReset();
  vi.stubGlobal('ref', ref);
  vi.stubGlobal('toRaw', toRaw);
  vi.stubGlobal('toValue', toValue);
  vi.stubGlobal('unref', unref);
  vi.stubGlobal('$fetch', fetch);
  vi.stubGlobal('useNotify', () => notify);
  vi.stubGlobal('useCodeVersion', () => ({ confirm: vi.fn() }));
  vi.stubGlobal('useDatabase', () => ({ getIdFieldName: () => 'id' }));
  vi.stubGlobal('showError', vi.fn());
  vi.stubGlobal('createError', (error: unknown) => error);
});
afterEach(() => vi.unstubAllGlobals());

describe('useApi single and batch contracts', () => {
  it('preserves single response identity and resolves async query getters', async () => {
    const response = { data: [{ id: 0 }] };
    fetch.mockResolvedValue(response);
    const api = useApi<typeof response>('/records', { query: () => ({ filter: Promise.resolve({ id: { _eq: 0 } }) }) });
    expect(await api.execute({ id: 0 })).toBe(response);
    expect(toRaw(api.data.value)).toBe(response);
    const firstId = computed(() => api.data.value?.data[0]?.id);
    expect(firstId.value).toBe(0);
    const first = api.data.value?.data[0];
    if (first) first.id = 1;
    expect(firstId.value).toBe(1);
    expect(fetch).toHaveBeenCalledWith('/api/records/0', expect.objectContaining({ query: { filter: { id: { _eq: 0 } } } }));
  });

  it('returns ordered batch responses and keeps bounded concurrency', async () => {
    let active = 0;
    let peak = 0;
    fetch.mockImplementation(async (path: string) => {
      peak = Math.max(peak, ++active);
      await Promise.resolve();
      active--;
      return { path };
    });
    const api = useApi<{ path: string }>('/records', { method: 'delete', batch: true });
    const result = await api.executeWithResult({ ids: [0, 1, 2], concurrent: 2 });
    expect(result).toEqual({ ok: true, data: [{ path: '/api/records/0' }, { path: '/api/records/1' }, { path: '/api/records/2' }] });
    expect(api.data.value).toEqual(result.ok ? result.data : null);
    expect(peak).toBeLessThanOrEqual(2);
    expect(api.pending.value).toBe(false);
  });

  it('keeps upload-specific headers aligned with each file', async () => {
    fetch.mockResolvedValue({ uploaded: true });
    const files = [new FormData(), new FormData()];
    const api = useApi<{ uploaded: boolean }>('/files', { method: 'post', batch: true });
    await api.execute({ files, headersByIndex: { 0: { upload: 'first' }, 1: { upload: 'second' } } });
    expect(fetch.mock.calls.map(call => call[1].headers)).toEqual([{ upload: 'first' }, { upload: 'second' }]);
    expect(api.data.value).toHaveLength(2);
  });

  it('waits for failed batch siblings and keeps the failed request path', async () => {
    const completed: string[] = [];
    fetch.mockImplementation(async (path: string) => {
      await Promise.resolve();
      completed.push(path);
      if (path.endsWith('/1')) throw new Error('rejected');
      return { path };
    });
    const api = useApi('/records', { method: 'delete', batch: true, onError: () => true });
    const result = await api.executeWithResult({ ids: [0, 1, 2] });
    expect(completed).toHaveLength(3);
    expect(result).toMatchObject({ ok: false, error: { url: '/api/records/1' }, aborted: false });
    expect(api.data.value).toBeNull();
    expect(api.pending.value).toBe(false);
  });

  it('does not commit a superseded read even if the transport ignores abort', async () => {
    let resolveFirst: ((value: { id: number }) => void) | undefined;
    fetch.mockImplementationOnce(() => new Promise<{ id: number }>(resolve => { resolveFirst = resolve; }));
    fetch.mockResolvedValueOnce({ id: 2 });
    const api = useApi<{ id: number }>('/records');
    const first = api.executeWithResult();
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledOnce());
    expect(await api.execute()).toEqual({ id: 2 });
    resolveFirst?.({ id: 1 });
    expect(await first).toEqual({ ok: false, error: null, aborted: true });
    expect(api.data.value).toEqual({ id: 2 });
  });

  it('rejects empty batches before transport and retains independent mutation requests', async () => {
    const api = useApi('/records', { method: 'delete', batch: true, onError: () => true });
    expect(await api.executeWithResult({ ids: [] })).toMatchObject({ ok: false, aborted: false });
    expect(fetch).not.toHaveBeenCalled();
    fetch.mockResolvedValue({ saved: true });
    const mutation = useApi('/records', { method: 'post' });
    await Promise.all([mutation.execute(), mutation.execute()]);
    expect(fetch.mock.calls.every(call => !call[1].signal.aborted)).toBe(true);
  });
});
