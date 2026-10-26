import { mountSuspended } from '@nuxt/test-utils/runtime';
import { defineComponent, h, provide, ref } from 'vue';
import { expect, it } from 'vitest';
import FieldRenderer from '~/components/form/FieldRenderer.vue';
import { FORM_EDITOR_DRAFT_ERROR_KEY } from '~/utils/form/form-editor-context';
const Code = defineComponent({ name: 'FormCodeEditorLazy', props: ['modelValue'], emits: ['update:modelValue'], template: '<div />' });
it('keeps editor-only invalid JSON errors separate from schema errors until correction', async () => {
  const drafts = ref<Record<string, string>>({});
  const model = ref({ payload: { valid: true } });
  const wrapper = await mountSuspended(defineComponent({ setup() {
    provide(FORM_EDITOR_DRAFT_ERROR_KEY, (key, error) => { if (error) drafts.value[key] = error; else delete drafts.value[key]; });
    return () => h(FieldRenderer, { keyName: 'payload', formData: model.value, columnMap: new Map([['payload', { name: 'payload', fieldType: 'column', type: 'json' }]]), errors: {}, 'onUpdate:formData': (_key, value) => { model.value.payload = value; } });
  } }), { global: { stubs: { FormCodeEditorLazy: Code } } });
  try {
    const editor = wrapper.getComponent(Code);
    editor.vm.$emit('update:modelValue', '{broken');
    await wrapper.vm.$nextTick();
    expect(drafts.value).toEqual({ payload: 'Invalid JSON' });
    expect(model.value.payload).toEqual({ valid: true });
    expect(editor.props('modelValue')).toBe('{broken');
    model.value = { payload: { valid: true } };
    await wrapper.vm.$nextTick();
    expect(drafts.value).toEqual({});
    expect(editor.props('modelValue')).toContain('"valid": true');
    editor.vm.$emit('update:modelValue', '{"valid":false}');
    expect(drafts.value).toEqual({});
    expect(model.value.payload).toEqual({ valid: false });
  } finally { wrapper.unmount(); }
});
