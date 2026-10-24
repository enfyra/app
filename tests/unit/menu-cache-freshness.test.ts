import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { ref } from 'vue';
import { expect, it } from 'vitest';
const state = { next: null as any, fields: [] as string[] };
const shared = new Map<string, any>();
mockNuxtImport('useState', () => (key: string, init: () => unknown) => {
  if (!shared.has(key)) shared.set(key, ref(init()));
  return shared.get(key);
});
mockNuxtImport('useApi', () => (_url: unknown, options: any) => {
  const data = ref<any>(null);
  return { data, execute: async () => { state.fields.push(options.query.value.fields); data.value = state.next; return data.value; } };
});
import { useMenuApi } from '~/composables/menu/useMenuApi';
it('does not let an older enriched menu snapshot shadow a later base refresh', async () => {
  const api = useMenuApi();
  state.next = { data: [{ id: 1, label: 'before', extension: { id: 2 } }] };
  await api.fetchMenuDefinitions({ includeExtensions: true });
  state.next = { data: [{ id: 1, label: 'after', isEnabled: false }] };
  await api.fetchMenuDefinitions();
  expect(api.menuDefinitions.value?.data[0]).toMatchObject({ label: 'after', isEnabled: false });
  expect(state.fields.at(-1)).toContain('extension.');
});
