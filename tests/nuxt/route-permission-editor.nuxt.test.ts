import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { flushPromises } from '@vue/test-utils';
import { defineComponent, ref } from 'vue';
import { expect, it, vi } from 'vitest';
const state = { query: null as any, write: vi.fn() };
mockNuxtImport('useDatabase', () => () => ({ getId: (record: any) => record?._id ?? record?.id, getIdFieldName: () => '_id' }));
mockNuxtImport('usePermissions', () => () => ({ checkPermissionCondition: () => true }));
mockNuxtImport('useSchema', () => () => ({ ensureSchema: async () => undefined, generateEmptyForm: () => ({}), useFormChanges: () => ({ update: () => undefined, checkChanges: () => true }) }));
mockNuxtImport('useApi', () => (_url: any, options: any) => {
  const data = ref<any>(null);
  return { data, pending: ref(false), error: ref(null), executeWithResult: async (args: any) => { state.write(args); return { ok: true, data: {} }; }, execute: async (args: any) => {
    if (options.method) state.write(args);
    else { state.query = typeof options.query === 'function' ? await options.query() : options.query; data.value = { data: [{ _id: 'permission', isEnabled: true, route: { _id: 'route' }, routeMethodConfigs: [{ _id: 'operation', available: true, method: { name: 'PATCH' } }] }] }; }
    return data.value;
  } };
});
import Manager from '~/components/permission/PermissionManager.vue';
const Editor = defineComponent({ name: 'FormEditorLazy', props: ['fieldMap', 'modelValue'], template: '<div />' });
it('reads and edits canonical route operations without creating a removed methods relation', async () => {
  const wrapper = await mountSuspended(Manager, { props: { tableName: 'enfyra_route_permission', currentFieldId: { field: 'route', value: 'route' } }, global: { stubs: {
    CommonDrawer: { props: ['modelValue', 'primaryAction'], template: '<div v-if="modelValue"><slot name="body" /><button data-save @click="primaryAction.onClick()">Save</button></div>' },
    FormEditorLazy: Editor,
  } } });
  try {
    await flushPromises();
    expect(state.query.fields).toContain('routeMethodConfigs.method.name');
    expect(state.query.deep.routeMethodConfigs.limit).toBe(0);
    expect(wrapper.text()).toContain('PATCH');
    await (wrapper.vm as any).createNewPermission();
    await flushPromises();
    const editor = wrapper.getComponent(Editor);
    expect(editor.props('fieldMap').routeMethodConfigs.component).toBeDefined();
    expect(editor.props('fieldMap').methods).toBeUndefined();
    expect(editor.props('modelValue').route).toEqual({ _id: 'route' });
    editor.props('modelValue').role = { _id: 'editor' };
    editor.props('modelValue').routeMethodConfigs = [{ _id: 'operation' }];
    await wrapper.get('[data-save]').trigger('click');
    expect(state.write).toHaveBeenCalledWith({ body: { route: { _id: 'route' }, role: { _id: 'editor' }, routeMethodConfigs: [{ _id: 'operation' }] } });
  } finally { wrapper.unmount(); }
});
