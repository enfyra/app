import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { flushPromises } from '@vue/test-utils';
import { defineComponent, h, ref } from 'vue';
import { expect, it, vi } from 'vitest';
const state = { registry: ref<any>(null) };
mockNuxtImport('useFormEditorRegistry', () => () => state.registry);
mockNuxtImport('usePermissions', () => () => ({ checkPermissionCondition: () => true }));
mockNuxtImport('useSchema', () => () => {
  const originalData = ref<any>({});
  const definition = [{ name: 'payload', type: 'json', fieldType: 'column' }];
  return { definition: ref(definition), fieldMap: ref(new Map([['payload', definition[0]]])), schema: ref({}),
    sortFieldsByOrder: (items: any) => items, validate: () => ({ isValid: true, errors: {} }),
    useFormChanges: () => ({ originalData, update: (data: any) => { originalData.value = JSON.parse(JSON.stringify(data)); }, checkChanges: () => true }),
  };
});
mockNuxtImport('useUniqueCheck', () => () => ({ isFieldInUnique: () => false, getCheckStatus: () => ({ status: 'idle' }), checkUnique: vi.fn(), resetCheck: vi.fn() }));
import Editor from '~/components/form/Editor.vue';
import { useFormValidation } from '~/composables/form/useFormValidation';
const Code = defineComponent({ name: 'FormCodeEditorLazy', props: ['modelValue'], emits: ['update:modelValue'], template: '<div />' });
it('blocks parent Save for an invalid editor draft and unblocks after correction', async () => {
  const record = ref({ id: 1, payload: { old: true } });
  const errors = ref<Record<string, string>>({});
  let validateForm: ReturnType<typeof useFormValidation>['validateForm'];
  const wrapper = await mountSuspended(defineComponent({ setup() {
    ({ validateForm } = useFormValidation('orders'));
    return () => h(Editor, { modelValue: record.value, errors: errors.value, tableName: 'orders',
      'onUpdate:modelValue': value => { record.value = value as typeof record.value; }, 'onUpdate:errors': value => { errors.value = value; },
    });
  } }), { global: { stubs: { FormCodeEditorLazy: Code } } });
  try {
    await flushPromises();
    const code = wrapper.getComponent(Code);
    code.vm.$emit('update:modelValue', '{invalid');
    await flushPromises();
    expect(await validateForm!(record.value, errors)).toBe(false);
    expect(errors.value.payload).toBe('Invalid JSON');
    code.vm.$emit('update:modelValue', '{"fixed":true}');
    await flushPromises();
    expect(await validateForm!(record.value, errors)).toBe(true);
  } finally { wrapper.unmount(); state.registry.value = null; }
});
