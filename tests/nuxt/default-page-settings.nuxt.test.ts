import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { flushPromises } from '@vue/test-utils';
import { defineComponent, ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';

const calls = vi.hoisted(() => ({ save: vi.fn(), record: { id: 1, projectName: 'Project', defaultPage: { id: 7 }, defaultPageId: 7 } }));
mockNuxtImport('useNotify', () => () => ({ success: vi.fn() }));
mockNuxtImport('useConfirm', () => () => ({ confirm: vi.fn() }));
mockNuxtImport('usePermissions', () => () => ({ checkPermissionCondition: () => true }));
mockNuxtImport('useDatabase', () => () => ({ getIdFieldName: () => 'id', getId: (value: any) => value?.id }));
mockNuxtImport('useFormValidation', () => () => ({ validateForm: vi.fn(async () => true) }));
mockNuxtImport('usePageHeaderRegistry', () => () => ({ registerPageHeader: vi.fn() }));
mockNuxtImport('useGlobalState', () => () => ({ settings: ref({}) }));
mockNuxtImport('useSchema', () => () => ({
  useFormChanges: () => ({ originalData: ref(null), update: vi.fn(), discardChanges: vi.fn() }),
}));
mockNuxtImport('useApi', () => (_url: unknown, options: any) => ({
  data: ref({ data: [calls.record] }), pending: ref(false), error: ref(null),
  execute: options?.method === 'patch' ? calls.save : vi.fn(async () => ({})),
}));
import GeneralSettings from '~/pages/settings/general/index.vue';

describe('Default page setting payload', () => {
  it('normalizes the relation, saves id-only selection and strips the physical FK', async () => {
    calls.save.mockClear();
    const form = defineComponent({
      setup(_props, { expose }) { expose({ confirmChanges: vi.fn() }); },
      props: ['modelValue', 'fieldMap', 'sections'], emits: ['update:modelValue', 'has-changed'],
      template: `<button type="button" data-testid="choose-page" @click="$emit('update:modelValue', { ...modelValue, defaultPage: 8 }); $emit('has-changed', true)">Choose page</button>`,
    });
    const wrapper = await mountSuspended(GeneralSettings, { route: '/settings/general', global: { stubs: { FormEditorLazy: form, CommonCorsOriginList: true } } });
    await flushPromises();
    expect(wrapper.findComponent(form).props('modelValue').defaultPage).toBe('7');
    expect(wrapper.findComponent(form).props('sections')[0].fields).toContain('defaultPage');
    await wrapper.get('[data-testid="choose-page"]').trigger('click');
    await wrapper.get('form').trigger('submit');
    await flushPromises();
    expect(calls.save).toHaveBeenCalledWith({ body: { id: 1, projectName: 'Project', defaultPage: 8 } });
    wrapper.unmount();
  });
});
