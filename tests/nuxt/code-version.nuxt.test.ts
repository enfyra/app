import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { flushPromises } from '@vue/test-utils';
import { defineComponent } from 'vue';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useApi } from '~/composables/shared/useApi';

const state = vi.hoisted(() => ({ confirm: vi.fn(), notify: vi.fn(), fetch: vi.fn() }));
mockNuxtImport('$fetch', () => state.fetch);
mockNuxtImport('useCodeVersion', () => () => ({ confirm: state.confirm }));
mockNuxtImport('useNotify', () => () => ({ error: state.notify }));
const Harness = defineComponent({ setup() { return { api: useApi('/enfyra_helper', { method: 'patch', disableErrorPage: true }) }; }, template: '<div />' });
let wrapper: Awaited<ReturnType<typeof mountSuspended>> | undefined;
afterEach(() => { wrapper?.unmount(); wrapper = undefined; vi.unstubAllGlobals(); vi.clearAllMocks(); });

describe('useApi versioned PATCH', () => {
  it('sends only the confirmed version and never mutates the editor draft', async () => {
    const fetch = state.fetch.mockReset().mockResolvedValueOnce({ data: [{ version: '1.0.0' }] }).mockResolvedValueOnce({ data: [{ id: 7, version: '2.0.0' }] });
    vi.stubGlobal('$fetch', fetch);
    state.confirm.mockResolvedValue('2.0.0');
    wrapper = await mountSuspended(Harness);
    const draft = { sourceCode: 'return 1;', version: '1.0.0' };
    const result = await (wrapper.vm as any).api.executeWithResult({ id: 7, body: draft });
    expect(result.ok).toBe(true);
    expect(fetch.mock.calls[0]?.[0]).toBe('/api/enfyra_helper');
    expect(fetch.mock.calls[0]?.[1].query).toEqual({ fields: 'version', limit: 1, filter: { id: { _eq: '7' } } });
    expect(fetch.mock.calls[1]?.[1].body.version).toBe('2.0.0');
    expect(draft.version).toBe('1.0.0');
  });
  it('treats dismissal as a cancelled save without a PATCH or success result', async () => {
    const fetch = state.fetch.mockReset().mockResolvedValue({ data: [{ version: '1.0.0' }] });
    vi.stubGlobal('$fetch', fetch);
    state.confirm.mockResolvedValue(null);
    wrapper = await mountSuspended(Harness);
    const api = (wrapper.vm as any).api;
    const result = await api.executeWithResult({ id: 7, body: {} });
    await flushPromises();
    expect(result).toEqual({ ok: false, error: null, aborted: true });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(api.error.value?.message ?? api.error?.message).toBe('Save cancelled');
    expect(state.notify).not.toHaveBeenCalled();
  });
});
