import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { flushPromises } from '@vue/test-utils';
import { ref } from 'vue';
import { expect, it } from 'vitest';
import { UInputMenu } from '#components';
const state = { query: null as any };
mockNuxtImport('useDatabase', () => () => ({ getId: (record: any) => record?._id ?? record?.id, getIdFieldName: () => '_id' }));
mockNuxtImport('useApi', () => (_url: any, options: any) => {
  const data = ref<any>(null);
  return { data, pending: ref(false), execute: async () => { state.query = options.query.value; data.value = { data: [{ _id: 'operation', method: { name: 'PATCH' }, available: true }] }; } };
});
import Selector from '~/components/permission/OperationSelector.vue';
it('selects operation identities scoped to the current route, not method identities', async () => {
  const wrapper = await mountSuspended(Selector, { props: { routeId: 'route', modelValue: [] } });
  try {
    await flushPromises();
    expect(state.query.filter).toEqual({ route: { _eq: 'route' }, available: { _eq: true } });
    const input = wrapper.getComponent(UInputMenu);
    expect((input.props() as { items?: unknown }).items).toEqual([{ label: 'PATCH', value: 'operation', id: 'operation' }]);
    input.vm.$emit('update:modelValue', ['operation']);
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([[{ _id: 'operation' }]]);
  } finally { wrapper.unmount(); }
});
