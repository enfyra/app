import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { flushPromises } from '@vue/test-utils';
import { ref } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import OriginList from '~/components/common/OriginList.vue';

const state = vi.hoisted(() => ({ calls: [] as Array<{ path: string; method: string; body?: unknown; id?: string | number }>, fail: false, allowed: true, rows: [] as Array<{ id: number; value: string; isEnabled: boolean }> }));
mockNuxtImport('useNotify', () => () => ({ success: vi.fn(), warning: vi.fn() }));
mockNuxtImport('useConfirm', () => () => ({ confirm: async () => true }));
mockNuxtImport('useDatabase', () => () => ({ getId: (row: { id: number }) => row.id }));
mockNuxtImport('usePermissions', () => () => ({ checkPermissionCondition: () => state.allowed }));
mockNuxtImport('useApi', () => (path: () => string, options: { method?: string }) => {
  const error = ref<unknown>(null);
  return { data: ref({ data: state.rows }), pending: ref(false), error, execute: vi.fn(async (input?: { body?: unknown; id?: string | number }) => {
    state.calls.push({ path: path(), method: options.method ?? 'get', ...(input?.body ? { body: input.body } : {}), ...(input?.id !== undefined ? { id: input.id } : {}) });
    error.value = state.fail && options.method ? new Error('fixture rejection') : null;
    return error.value ? null : { data: [] };
  }) };
});
let wrapper: Awaited<ReturnType<typeof mountSuspended>> | undefined;
beforeEach(() => { state.calls = []; state.fail = false; state.allowed = true; state.rows = []; });
afterEach(() => wrapper?.unmount());

describe('OAuth Auth Origins management', () => {
  it('writes only the auth table and keeps a rejected draft for correction', async () => {
    wrapper = await mountSuspended(OriginList, { props: { kind: 'auth' } });
    await flushPromises();
    expect(wrapper.text()).toContain('External authentication redirects are denied');
    expect(state.calls[0]?.path).toBe('/enfyra_auth_origin');
    await wrapper.get('input').setValue('https://console.example.test');
    state.fail = true;
    await wrapper.get('button[aria-label="Add Auth origin"]').trigger('click');
    await flushPromises();
    expect((wrapper.get('input').element as HTMLInputElement).value).toBe('https://console.example.test');
    state.fail = false;
    await wrapper.get('button[aria-label="Add Auth origin"]').trigger('click');
    await flushPromises();
    expect((wrapper.get('input').element as HTMLInputElement).value).toBe('');
    expect(state.calls.filter(call => call.method === 'post')).toHaveLength(2);
    expect(state.calls.find(call => call.method === 'post')?.body).toEqual({ value: 'https://console.example.test', isEnabled: true });
    expect(state.calls.every(call => call.path === '/enfyra_auth_origin')).toBe(true);
  });

  it('updates and removes the exact auth-origin identity without writing CORS', async () => {
    state.rows = [{ id: 42, value: 'https://console.example.test', isEnabled: true }];
    wrapper = await mountSuspended(OriginList, { props: { kind: 'auth' } });
    await flushPromises();
    expect(wrapper.get('ul').classes()).toContain('rounded-[var(--radius-control)]');
    expect(wrapper.get('ul').classes()).not.toContain('rounded-[var(--radius-card)]');
    expect(wrapper.get('input').classes()).toContain('rounded-[var(--radius-control)]');
    expect(wrapper.get('input').classes()).toContain('!ring-0');
    expect(wrapper.get('button[aria-label="Add Auth origin"]').classes()).toContain('!rounded-[var(--radius-control)]');
    await wrapper.get('button[role="switch"]').trigger('click');
    await flushPromises();
    expect(state.calls.find(call => call.method === 'patch')).toEqual({ path: '/enfyra_auth_origin', method: 'patch', id: 42, body: { isEnabled: false } });
    await wrapper.get('button[aria-label="Remove https://console.example.test"]').trigger('click');
    await flushPromises();
    expect(state.calls.find(call => call.method === 'delete')).toEqual({ path: '/enfyra_auth_origin', method: 'delete', id: 42 });
    expect(state.calls.every(call => call.path === '/enfyra_auth_origin')).toBe(true);
  });

  it('rejects paths instead of silently trusting a different origin', async () => {
    wrapper = await mountSuspended(OriginList, { props: { kind: 'auth' } });
    await wrapper.get('input').setValue('https://console.example.test/unexpected');
    await wrapper.get('button[aria-label="Add Auth origin"]').trigger('click');
    await flushPromises();
    expect(state.calls.some(call => call.method === 'post')).toBe(false);
  });

  it('keeps public CORS management on its own table and explains its empty-list meaning', async () => {
    wrapper = await mountSuspended(OriginList, { props: { kind: 'cors' } });
    await flushPromises();
    expect(wrapper.text()).toContain('Public cross-origin requests are allowed without cookies');
    expect(state.calls.every(call => call.path === '/enfyra_cors_origin')).toBe(true);
  });

  it('does not expose creation controls without mutation permission', async () => {
    state.allowed = false;
    wrapper = await mountSuspended(OriginList, { props: { kind: 'auth' } });
    expect(wrapper.find('input').exists()).toBe(false);
    expect(wrapper.find('button[aria-label="Add Auth origin"]').exists()).toBe(false);
  });
});
