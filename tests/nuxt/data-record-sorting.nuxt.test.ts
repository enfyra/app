import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { flushPromises } from '@vue/test-utils';
import { defineComponent, ref } from 'vue';
import { expect, it } from 'vitest';
const state = { query: null as any };
mockNuxtImport('useSchema', () => () => ({ schemas: ref({ orders: { definition: [{ fieldType: 'column', name: 'title', type: 'varchar' }] } }), schemaReady: ref(true), getColumnFields: () => 'title' }));
mockNuxtImport('useRoutes', () => () => ({ getRouteForTableName: () => '/orders', ensureRoutesLoaded: async () => undefined }));
mockNuxtImport('useApi', () => (_url: any, options: any) => ({ data: ref({ data: [], meta: {} }), pending: ref(false), execute: async () => { state.query = options.query.value; } }));
import DataList from '~/pages/data/[table]/index.vue';
const Table = defineComponent({ name: 'DataTableLazy', props: ['sorting', 'sortingOptions'], emits: ['update:sorting'], template: '<div />' });
it('sorts the server dataset and resets paging rather than sorting only the loaded page', async () => {
  const wrapper = await mountSuspended(DataList, { route: '/data/orders?page=3', global: { stubs: { DataTableLazy: Table } } });
  try {
    await flushPromises();
    const table = wrapper.getComponent(Table);
    expect(table.props('sortingOptions')).toMatchObject({ manualSorting: true });
    table.vm.$emit('update:sorting', [{ id: 'title', desc: false }]);
    await flushPromises();
    expect(state.query).toMatchObject({ page: 1, sort: 'title' });
  } finally { wrapper.unmount(); }
});
