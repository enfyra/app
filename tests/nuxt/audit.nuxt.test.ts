import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { flushPromises } from '@vue/test-utils';
import { useRouter } from '#app';
import { defineComponent, ref } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VERSIONED_CODE_TABLES } from '~/utils/code-version';

const state = vi.hoisted(() => ({ history: vi.fn(), entry: vi.fn(), current: vi.fn(), restore: vi.fn(), cancel: vi.fn(), confirm: vi.fn(), notify: vi.fn(), canRead: true, canPatch: true }));
mockNuxtImport('usePageHeaderRegistry', () => () => ({ registerPageHeader: vi.fn() }));
mockNuxtImport('useNotify', () => () => ({ success: state.notify, error: state.notify }));
mockNuxtImport('useCodeVersion', () => () => ({ confirm: state.confirm }));
mockNuxtImport('usePermissions', () => () => ({ checkPermissionCondition: (condition: any) => condition.and.some((item: any) => item.methods.includes('PATCH')) ? state.canPatch : state.canRead }));
mockNuxtImport('useSettingsPageSize', () => () => ref(20));
mockNuxtImport('useDatabase', () => () => ({ getId: (record: any) => record.id ?? record._id, getIdFieldName: () => 'id', createIdFilter: (id: unknown) => ({ id: { _eq: id } }) }));
mockNuxtImport('useApi', () => (url: unknown) => ({ executeWithResult: typeof url === 'function' ? state.current : url === '/admin/code-audit/revert' ? state.restore : url === '/enfyra_audit' ? (options: any) => options.query.fields.includes('previous') ? state.entry(options) : state.history(options) : state.history, pending: ref(false), cancel: state.cancel }));

import CodeHistory from '~/pages/settings/audit.vue';

const TableStub = defineComponent({ name: 'HistoryTableStub', props: { data: Array, page: Number, total: Number, searchable: Boolean, search: String, searchLabel: String, reload: Function, reloadLoading: Boolean, paginationMode: String, hasNextPage: Boolean }, emits: ['row-click', 'update:search', 'search', 'update:page'], template: '<div><slot name="toolbar-actions" />{{ JSON.stringify(data) }}</div>' });
const DrawerStub = defineComponent({ name: 'HistoryDrawerStub', props: ['modelValue', 'primaryAction'], template: '<div><slot name="header" /><slot name="body" /></div>' });
const EditorStub = defineComponent({ name: 'HistoryEditorStub', props: { modelValue: String }, template: '<pre>{{ modelValue }}</pre>' });
let wrapper: Awaited<ReturnType<typeof mountSuspended>> | undefined;
const revision = (id: number) => ({ id, tableName: 'enfyra_helper', recordId: '7', action: 'update', fromVersion: '1.0.0', toVersion: '1.0.1', previous: { sourceCode: `return ${id};` } });

beforeEach(() => {
  vi.clearAllMocks();
  state.canRead = true;
  state.canPatch = true;
  state.history.mockResolvedValue({ ok: true, data: { data: [revision(2)], meta: { filterCount: 1 } } });
  state.entry.mockImplementation(({ query }: any) => Promise.resolve({ ok: true, data: { data: [revision(query.filter.id._eq)] } }));
  state.current.mockResolvedValue({ ok: true, data: { data: [{ version: '3.0.1' }] } });
  state.restore.mockResolvedValue({ ok: true });
  state.confirm.mockResolvedValue('4.0.0');
});
afterEach(() => { wrapper?.unmount(); wrapper = undefined; });
async function mountPage() {
  wrapper = await mountSuspended(CodeHistory, { route: '/settings/audit?table=enfyra_helper&recordId=7', global: { stubs: { DataTableSettingsTable: TableStub, CommonDrawer: DrawerStub, FormCodeEditorLazy: EditorStub } } });
  await flushPromises();
  return wrapper;
}

describe('Audit page', () => {
  it('lists bounded exact targets without loading previous source', async () => {
    await mountPage();
    const query = state.history.mock.calls.at(-1)![0].query;
    expect(query.filter).toEqual({ tableName: { _eq: 'enfyra_helper' }, recordId: { _eq: '7' } });
    expect(query.limit).toBe(21);
    expect(query.page).toBeUndefined();
    expect(query.sort).toBe('-id');
    expect(query.fields).not.toContain('previous');
  });
  it('defaults to all code tables and uses a cursor on later pages', async () => {
    wrapper = await mountSuspended(CodeHistory, { route: '/settings/audit', global: { stubs: { DataTableSettingsTable: TableStub, CommonDrawer: DrawerStub, FormCodeEditorLazy: EditorStub } } });
    await flushPromises();
    const query = state.history.mock.calls.at(-1)![0].query;
    expect(query.filter).toBeUndefined();
    const items = wrapper.getComponent({ name: 'UDropdownMenu' }).props('items') as any[];
    expect(items.map(item => item.label)).toEqual(['All', ...VERSIONED_CODE_TABLES]);
    expect(items[0].checked).toBe(true);
    state.history.mockClear();
    items[3].onUpdateChecked();
    await expect.poll(() => useRouter().currentRoute.value.query.table).toBe(VERSIONED_CODE_TABLES[2]);
    await flushPromises();
    expect(state.history.mock.calls.at(-1)![0].query.filter).toEqual({ tableName: { _eq: VERSIONED_CODE_TABLES[2] } });
  });
  it('loads the next cursor page when the paginator advances', async () => {
    const firstPage = Array.from({ length: 21 }, (_, index) => revision(100 - index));
    state.history.mockResolvedValueOnce({ ok: true, data: { data: firstPage, meta: { filterCount: 21 } } });
    const page = await mountPage();
    const table = page.getComponent(TableStub);
    expect(table.props('hasNextPage')).toBe(true);
    expect(table.props('page')).toBe(1);
    state.history.mockClear();
    table.vm.$emit('update:page', 2);
    await flushPromises();
    expect(state.history).toHaveBeenCalledOnce();
    expect(state.history.mock.calls[0]![0].query.filter).toMatchObject({ id: { _lt: 81 } });
    expect(table.props('page')).toBe(2);
  });
  it('keeps the population count from the first page while paging', async () => {
    const firstPage = Array.from({ length: 21 }, (_, index) => revision(100 - index));
    state.history.mockResolvedValueOnce({ ok: true, data: { data: firstPage, meta: { filterCount: 109 } } });
    state.history.mockResolvedValueOnce({ ok: true, data: { data: [revision(79), revision(78)], meta: { filterCount: 2 } } });
    const page = await mountPage();
    const table = page.getComponent(TableStub);
    expect(table.props('total')).toBe(109);
    expect(state.history.mock.calls[0]![0].query.meta).toBe('filterCount');
    state.history.mockClear();
    table.vm.$emit('update:page', 2);
    await flushPromises();
    expect(state.history.mock.calls[0]![0].query.meta).toBeUndefined();
    expect(table.props('total')).toBe(109);
  });
  it('uses the table-owned exact-ID search, toolbar selector and reload', async () => {
    const page = await mountPage();
    const table = page.getComponent(TableStub);
    expect(page.find('form').exists()).toBe(false);
    expect(table.props('searchable')).toBe(true);
    expect(table.props('searchLabel')).toBe('Exact record ID');
    expect(table.props('search')).toBe('7');
    expect(table.props('paginationMode')).toBe('cursor');
    expect(page.find('[aria-label="Code table"]').exists()).toBe(true);
    state.history.mockClear();
    table.vm.$emit('update:search', ' 9 ');
    await flushPromises();
    expect(state.history).not.toHaveBeenCalled();
    table.vm.$emit('search', ' 9 ');
    await expect.poll(() => useRouter().currentRoute.value.query.recordId).toBe('9');
    await flushPromises();
    expect(state.history.mock.calls.at(-1)![0].query.filter.recordId).toEqual({ _eq: '9' });
    state.history.mockClear();
    await table.props('reload')();
    expect(state.history).toHaveBeenCalledOnce();
    expect(state.history.mock.calls[0]![0].query.filter.recordId).toEqual({ _eq: '9' });
  });
  it('applies table changes without committing an ID draft and restores URL filters', async () => {
    const page = await mountPage();
    const table = page.getComponent(TableStub);
    table.vm.$emit('update:search', 'unsaved');
    await flushPromises();
    const items = page.getComponent({ name: 'UDropdownMenu' }).props('items') as any[];
    items.find(item => item.label === 'enfyra_extension')!.onUpdateChecked();
    await expect.poll(() => useRouter().currentRoute.value.query.table).toBe('enfyra_extension');
    await flushPromises();
    expect(state.history.mock.calls.at(-1)![0].query.filter).toEqual({ tableName: { _eq: 'enfyra_extension' }, recordId: { _eq: '7' } });
    expect(table.props('search')).toBe('7');
    await useRouter().replace('/settings/audit?table=enfyra_helper&recordId=8');
    await flushPromises();
    expect(table.props('search')).toBe('8');
    expect(state.history.mock.calls.at(-1)![0].query.filter).toEqual({ tableName: { _eq: 'enfyra_helper' }, recordId: { _eq: '8' } });
  });
  it('describes the revision with caller, credential, and separated source values', async () => {
    const page = await mountPage();
    state.entry.mockResolvedValueOnce({ ok: true, data: { data: [{ ...revision(2), changedByEmail: 'dev@example.test', changedBySource: 'pat', createdAt: '2026-10-20T10:00:00.000Z', previous: { sourceCode: 'return 1;', description: 'demo', isEnabled: false } }] } });
    page.getComponent(TableStub).vm.$emit('row-click', revision(2));
    await flushPromises();
    const drawer = page.getComponent(DrawerStub);
    expect(drawer.text()).toContain('Updated · enfyra_helper');
    expect(drawer.text()).toContain('dev@example.test');
    expect(drawer.text()).toContain('PAT');
    expect(drawer.text()).toContain('Source before this change');
    expect(drawer.text()).toContain('Other values at this revision');
    expect(drawer.text()).not.toContain('"sourceCode"');
  });
  it('does not read history without permission', async () => {
    state.canRead = false;
    const page = await mountPage();
    expect(state.history).not.toHaveBeenCalled();
    expect(page.text()).toContain('Access denied');
  });
  it('keeps the latest selected revision when an older read completes late', async () => {
    const page = await mountPage();
    let finish!: (value: unknown) => void;
    state.entry.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    page.getComponent(TableStub).vm.$emit('row-click', revision(2));
    page.getComponent(TableStub).vm.$emit('row-click', revision(3));
    await flushPromises();
    finish({ ok: true, data: { data: [revision(2)] } });
    await flushPromises();
    expect(page.getComponent(DrawerStub).text()).toContain('return 3;');
    expect(page.getComponent(DrawerStub).text()).not.toContain('return 2;');
  });
  it('restores the inspected pre-image as the confirmed new version', async () => {
    const page = await mountPage();
    page.getComponent(TableStub).vm.$emit('row-click', revision(2));
    await flushPromises();
    await page.getComponent(DrawerStub).props('primaryAction').onClick();
    expect(state.entry.mock.calls.at(-1)![0].query.filter).toEqual({ id: { _eq: 2 } });
    expect(state.current).toHaveBeenCalledWith({ query: { fields: 'version', filter: { id: { _eq: '7' } }, limit: 1 } });
    expect(state.confirm).toHaveBeenCalledWith({ tableName: 'enfyra_helper', recordId: '7', currentVersion: '3.0.1', suggestedVersion: '3.0.2' });
    expect(state.restore).toHaveBeenCalledWith({ body: { auditId: 2, version: '4.0.0' } });
    expect(state.notify).toHaveBeenCalledOnce();
  });
  it('does not offer restoration without target PATCH permission or for delete entries', async () => {
    const page = await mountPage();
    state.canPatch = false;
    page.getComponent(TableStub).vm.$emit('row-click', revision(2));
    await flushPromises();
    expect(page.getComponent(DrawerStub).props('primaryAction')).toBe(false);
    state.canPatch = true;
    state.entry.mockResolvedValueOnce({ ok: true, data: { data: [{ ...revision(3), action: 'delete' }] } });
    page.getComponent(TableStub).vm.$emit('row-click', revision(3));
    await flushPromises();
    expect(page.getComponent(DrawerStub).props('primaryAction')).toBe(false);
    expect(state.restore).not.toHaveBeenCalled();
  });
});
