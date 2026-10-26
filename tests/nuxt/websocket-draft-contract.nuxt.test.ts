import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { flushPromises } from '@vue/test-utils';
import { defineComponent, ref } from 'vue';
import { expect, it } from 'vitest';
const state = { events: ref<any>({ data: [{ id: 2, eventName: 'before' }] }) };
mockNuxtImport('useApi', () => (_url: any, options: any) => ({
  data: options.errorContext === 'Fetch WebSocket Events' ? state.events : ref({ data: [{ id: 1, path: '/chat', sourceCode: 'original' }] }),
  pending: ref(false), error: ref(null), execute: async () => undefined,
}));
import Gateway from '~/pages/settings/websockets/[id].vue';
const Editor = defineComponent({ name: 'FormEditorLazy', props: ['modelValue'], emits: ['update:modelValue'], template: '<div />' });
it('keeps the unsaved gateway draft when events refresh independently', async () => {
  const wrapper = await mountSuspended(Gateway, { route: '/settings/websockets/1', global: { stubs: {
    FormEditorLazy: Editor, DataTableSettingsTable: true, WebsocketConnectionHandlerTestModal: true, WebsocketEventEditorDrawer: true,
  } } });
  try {
    await flushPromises();
    const editor = wrapper.getComponent(Editor);
    editor.vm.$emit('update:modelValue', { ...editor.props('modelValue'), sourceCode: 'unsaved' });
    await flushPromises();
    state.events.value = { data: [{ id: 2, eventName: 'updated' }] };
    await flushPromises();
    expect(editor.props('modelValue').sourceCode).toBe('unsaved');
  } finally { wrapper.unmount(); }
});
