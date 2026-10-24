import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { flushPromises } from '@vue/test-utils';
import { defineComponent, h, ref } from 'vue';
import { describe, expect, it } from 'vitest';
import ManageModal from '~/components/column-rule/ManageModal.vue';

mockNuxtImport('useConfirm', () => () => ({ confirm: async () => true }));
const Modal = defineComponent({ props: ['primaryAction'], template: '<div><slot name="header"/><slot name="body"/><button data-save @click="primaryAction.onClick()">Save</button></div>' });
const ValueEditor = defineComponent({ name: 'ColumnRuleValueEditor', props: ['modelValue'], template: '<span />' });
async function setup() {
  const rules = ref<any[]>([{ _id: 'mongo-rule', ruleType: 'max', value: { v: 200 }, message: 'old', isEnabled: false }]);
  const wrapper = await mountSuspended(defineComponent({ setup: () => () => h(ManageModal, { open: true, rules: rules.value, columnName: 'amount', columnType: 'int', 'onUpdate:rules': (value: any[]) => { rules.value = value; } }) }), { global: { stubs: { CommonModal: Modal, ColumnRuleValueEditor: ValueEditor } } });
  return { wrapper, rules };
}
describe('persisted column rules', () => {
  it('preserves a loaded value and Mongo identity when only its message is edited', async () => {
    const { wrapper, rules } = await setup();
    try {
      await wrapper.get('[aria-label="Edit max rule"]').trigger('click');
      await flushPromises();
      expect(wrapper.getComponent(ValueEditor).props('modelValue')).toEqual({ v: 200 });
      await wrapper.get('input').setValue('new message');
      await wrapper.get('[data-save]').trigger('click');
      expect(rules.value).toEqual([{ _id: 'mongo-rule', ruleType: 'max', value: { v: 200 }, message: 'new message', isEnabled: false }]);
    } finally { wrapper.unmount(); }
  });
  it('toggles and deletes Mongo rules by their stable identity', async () => {
    const { wrapper, rules } = await setup();
    try {
      await wrapper.get('[role="switch"]').trigger('click');
      expect(rules.value[0].isEnabled).toBe(true);
      await wrapper.get('[aria-label="Delete rule"]').trigger('click');
      await flushPromises();
      expect(rules.value).toEqual([]);
    } finally { wrapper.unmount(); }
  });
});
