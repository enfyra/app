import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { flushPromises } from '@vue/test-utils';
import { defineComponent, ref } from 'vue';
import { expect, it, vi } from 'vitest';
const state = { write: vi.fn() };
const step = { id: 2, key: 'disabled', type: 'script', stepOrder: 1, sourceCode: 'return true;', scriptLanguage: 'typescript', isEnabled: false };
mockNuxtImport('useAdminSocket', () => () => ({ adminSocket: null }));
mockNuxtImport('usePermissions', () => () => ({ checkPermissionCondition: () => true }));
mockNuxtImport('useDatabase', () => () => ({ getId: (value: any) => value?.id, getIdFieldName: () => 'id' }));
mockNuxtImport('useApi', () => (_url: any, options: any) => {
  const data = ref<any>(null);
  return { data, pending: ref(false), executeWithResult: async (args: any) => {
    if (options.errorContext === 'Update Step') { state.write(args); return { ok: true, data: { data: [step] } }; }
    const rows = options.errorContext === 'Fetch Flow' ? [{ id: 1, name: 'flow', steps: [step], triggers: [] }]
      : options.errorContext === 'Fetch Flow Step' ? [step] : [];
    data.value = { data: rows, meta: { filterCount: 0 } };
    return { ok: true, data: data.value };
  } };
});
import Flow from '~/pages/settings/flows/[id].vue';
const Canvas = defineComponent({ name: 'FlowCanvas', emits: ['select-step'], template: '<div />' });
const Drawer = defineComponent({ name: 'FlowStepEditorDrawer', props: ['form'], emits: ['save'], template: '<div />' });
it('preserves a disabled step through opening, editing and saving', async () => {
  const wrapper = await mountSuspended(Flow, { route: '/settings/flows/1?tab=steps', global: { stubs: {
    FlowCanvas: Canvas, FlowStepEditorDrawer: Drawer, FormEditorLazy: true, FlowExecutionsCard: true, FlowTriggersCard: true,
  } } });
  try {
    await flushPromises();
    wrapper.getComponent(Canvas).vm.$emit('select-step', step);
    await flushPromises();
    const drawer = wrapper.getComponent(Drawer);
    expect(drawer.props('form').isEnabled).toBe(false);
    expect(drawer.props('form').parentId).toBeNull();
    expect(drawer.props('form')).not.toHaveProperty('branch');
    drawer.vm.$emit('save');
    await flushPromises();
    expect(state.write).toHaveBeenCalledWith(expect.objectContaining({ body: expect.objectContaining({ isEnabled: false }) }));
  } finally { wrapper.unmount(); }
});
