import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { computed, ref } from 'vue';
import { beforeEach, expect, it, vi } from 'vitest';
const state = { patch: vi.fn(), create: vi.fn(), reads: vi.fn(), data: ref<any>({ data: [{ id: 1, priority: 1 }, { id: 2, priority: 2 }] }) };
mockNuxtImport('useState', () => (_key: string, init: () => unknown) => ref(init()));
mockNuxtImport('useDatabase', () => () => ({ getId: (row: any) => row?.id, getIdFieldName: () => 'id' }));
mockNuxtImport('useSchema', () => () => ({ getIncludeFields: () => '*', ensureSchema: async () => undefined, generateEmptyForm: () => ({}), validate: () => ({ isValid: true, errors: {} }) }));
mockNuxtImport('useNotify', () => () => ({ error: vi.fn(), success: vi.fn() }));
mockNuxtImport('useConfirm', () => () => ({ confirm: async () => true }));
vi.mock('../../app/utils/route-handler-hook-forms', () => ({ validateRouteHandlerForm: async () => ({ isValid: true, errors: {} }), validateRouteHookForm: async () => ({ isValid: true, errors: {} }) }));
mockNuxtImport('useApi', () => (_url: any, options: any) => ({
  data: state.data, pending: ref(false), error: ref(null),
  execute: options.method === 'patch' ? state.patch : options.method === 'post' ? state.create : state.reads,
  executeWithResult: async (args: any) => {
    const data = await (options.method === 'patch' ? state.patch : state.create)(args);
    return data === null ? { ok: false, aborted: true } : { ok: true, data };
  },
}));
import { useRouteEditorWorkflows } from '~/composables/route/useRouteEditorWorkflows';
beforeEach(() => { vi.clearAllMocks(); state.patch.mockResolvedValue({ data: [] }); state.create.mockResolvedValue({ data: [] }); });
it.each([0, 1])('stops insertion after failed/cancelled shift %s and refreshes acknowledged partial changes', async failAt => {
  state.patch.mockImplementation(async () => state.patch.mock.calls.length - 1 === failAt ? null : { data: [] });
  const editor = useRouteEditorWorkflows({ routeId: ref('route'), idField: 'id', availableMethodStrings: computed(() => ['GET']), mainTableName: computed(() => undefined) });
  await editor.createHook('pre', 'GET', 1);
  await editor.saveHook();
  expect(state.create).not.toHaveBeenCalled();
  expect(state.patch).toHaveBeenCalledTimes(failAt + 1);
  expect(state.reads).toHaveBeenCalled();
  expect(editor.showCreateHookDrawer.value).toBe(true);
});
