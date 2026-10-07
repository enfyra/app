import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { defineComponent, ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';

mockNuxtImport('useDatabase', () => () => ({ getId: (value: any) => value?.id ?? value?._id }));
mockNuxtImport('useMenuApi', () => () => ({
  menuDefinitions: ref({ data: [
    { id: 7, label: 'Home', path: '/home', type: 'Menu', isEnabled: true },
    { id: 8, label: 'Detail', path: '/items/:id', type: 'Menu', isEnabled: true },
    { id: 9, label: 'Disabled', path: '/disabled', type: 'Menu', isEnabled: false },
  ] }),
  fetchMenuDefinitions: vi.fn(async () => ({})),
}));
import DefaultPageSelect from '~/components/settings/DefaultPageSelect.vue';

describe('Default page selector', () => {
  it('shows concrete pages, emits id-only values, and supports clearing', async () => {
    const select = defineComponent({
      props: ['items', 'modelValue'], emits: ['update:modelValue'],
      template: `<select :value="modelValue" @change="$emit('update:modelValue', $event.target.value)"><option value="">None</option><option v-for="item in items" :key="item.value" :value="item.value">{{ item.label }}</option></select>`,
    });
    const wrapper = await mountSuspended(DefaultPageSelect, { props: { modelValue: null }, global: { stubs: { USelectMenu: select } } });
    expect(wrapper.text()).toContain('Home · /home');
    expect(wrapper.text()).not.toContain('Detail');
    expect(wrapper.text()).not.toContain('Disabled');
    await wrapper.get('select').setValue('7');
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([7]);
    await wrapper.setProps({ modelValue: { id: 7 } });
    await wrapper.get('[aria-label="Clear default page"]').trigger('click');
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([null]);
    wrapper.unmount();
  });
});
