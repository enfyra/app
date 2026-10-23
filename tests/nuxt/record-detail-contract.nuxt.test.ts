import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { flushPromises } from '@vue/test-utils';
import { defineComponent, h, ref } from 'vue';
import { beforeEach, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ actions: new Map<string, any>(), queries: [] as any[], write: vi.fn(), row: { id: 1, title: 'before', tags: Array.from({ length: 11 }, (_, id) => ({ id })) } }));
mockNuxtImport('useHeaderActionRegistry', () => () => ({ register: (items: any[]) => items.forEach(item => state.actions.set(item.id, item)) }));
mockNuxtImport('usePageHeaderRegistry', () => () => ({ registerPageHeader: vi.fn() }));
mockNuxtImport('useSchema', () => () => ({
  ensureSchema: async () => undefined,
  schemas: ref({ orders: { relations: [{ propertyName: 'tags', type: 'many-to-many' }] } }),
  definition: ref([{ propertyName: 'tags', fieldType: 'relation', type: 'many-to-many' }]),
  useFormChanges: () => {
    const originalData = ref({});
    return { originalData, update: (row: any) => { originalData.value = JSON.parse(JSON.stringify(row)); }, checkChanges: () => true };
  },
}));
mockNuxtImport('useFormValidation', () => () => ({ validateForm: async () => true }));
mockNuxtImport('useDatabase', () => () => ({ getId: (row: any) => row?.id, getIdFieldName: () => 'id' }));
mockNuxtImport('useRoutes', () => () => ({ getRouteForTableName: () => '/orders', ensureRoutesLoaded: async () => undefined }));
mockNuxtImport('useNotify', () => () => ({ success: vi.fn() }));
mockNuxtImport('useApi', () => (_url: any, options: any) => {
  const data = ref<any>(null);
  return { data, pending: ref(false), error: ref(null), execute: async (args: any) => {
    if (options.method) state.write(args);
    else {
      const query = typeof options.query === 'function' ? await options.query() : options.query.value;
      state.queries.push(query);
      data.value = { data: [{ ...state.row, tags: state.row.tags.slice(0, query.deep?.tags?.limit === 0 ? 11 : 10) }] };
    }
    return data.value;
  } };
});
import RecordDetail from '~/pages/data/[table]/[id].vue';

beforeEach(() => { vi.clearAllMocks(); state.actions.clear(); state.queries = []; });
it('loads complete relation identities and PATCHes only edited fields', async () => {
  const wrapper = await mountSuspended(RecordDetail, { route: '/data/orders/1', global: { stubs: {
    FormEditorLazy: defineComponent({ name: 'FormEditorLazy', props: ['modelValue'], setup: () => () => h('div') }),
    CommonFormHeader: true,
  } } });
  try {
    await flushPromises();
    const editor = wrapper.getComponent({ name: 'FormEditorLazy' });
    expect(editor.props('modelValue').tags).toHaveLength(11);
    editor.vm.$emit('update:modelValue', { ...editor.props('modelValue'), title: 'after' });
    await flushPromises();
    await state.actions.get('save-data-entry').submit();
    expect(state.write).toHaveBeenLastCalledWith({ id: '1', body: { title: 'after' } });
  } finally { wrapper.unmount(); }
});
