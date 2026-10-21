import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { useRouter } from '#app'
import { ref, unref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import SettingsTable from '~/components/data-table/SettingsTable.vue'
import SearchField from '~/components/common/SearchField.vue'
import { FILTER_OPERATORS } from '~/utils/common/filter/filter-operators'

const state = vi.hoisted(() => ({
  requests: [] as any[], data: undefined as any, allowed: false,
  remove: vi.fn(), confirm: vi.fn(), loadRoutes: vi.fn(), registerMenus: vi.fn(),
  fetchMenus: vi.fn(), invalidateExtension: vi.fn(), loadExtensions: vi.fn(),
}))
mockNuxtImport('useHeaderActionRegistry', () => () => ({ register: vi.fn() }))
mockNuxtImport('useSubHeaderActionRegistry', () => () => ({ register: vi.fn() }))
mockNuxtImport('usePageHeaderRegistry', () => () => ({ registerPageHeader: vi.fn() }))
mockNuxtImport('useSettingsPageSize', () => () => ref(10))
mockNuxtImport('useNotify', () => () => ({ success: vi.fn(), error: vi.fn() }))
mockNuxtImport('useConfirm', () => () => ({ confirm: state.confirm }))
mockNuxtImport('usePermissions', () => () => ({ hasPermission: () => state.allowed, checkPermissionCondition: () => state.allowed }))
mockNuxtImport('useDatabase', () => () => ({ getId: (row: any) => row?.id ?? row?._id, getIdFieldName: () => 'id' }))
mockNuxtImport('useKeyedLoaders', () => () => ({ getLoader: () => ({ isLoading: ref(false) }) }))
mockNuxtImport('useRoutes', () => () => ({ routes: ref([]), loadRoutes: state.loadRoutes }))
mockNuxtImport('useMenuRegistry', () => () => ({ registerDataMenuItemsFromRoutes: state.registerMenus, findMenuIconForPath: () => undefined }))
mockNuxtImport('useMenuApi', () => () => ({ fetchMenuDefinitions: state.fetchMenus }))
mockNuxtImport('useDynamicComponent', () => () => ({ invalidateExtensionCache: state.invalidateExtension }))
mockNuxtImport('useGlobalExtensions', () => () => ({ loadGlobalExtensions: state.loadExtensions }))
mockNuxtImport('useApi', () => (url: string | (() => string), options: any) => {
  const execute = vi.fn().mockResolvedValue(state.data.value)
  state.requests.push({ url: typeof url === 'function' ? url() : url, options, execute })
  return { data: state.data, pending: ref(false), error: ref(null), execute, executeWithResult: state.remove }
})

import RolesPage from '~/pages/settings/roles/index.vue'
import RoutesPage from '~/pages/settings/routes/index.vue'
import GuardsPage from '~/pages/settings/guards/index.vue'
import FlowsPage from '~/pages/settings/flows/index.vue'
import ExtensionsPage from '~/pages/settings/extensions/index.vue'
import WebSocketsPage from '~/pages/settings/websockets/index.vue'
import AccountsPage from '~/pages/settings/oauth/accounts/index.vue'

const cases = [
  { path: 'roles', component: RolesPage, api: '/enfyra_role', field: 'name', base: [] },
  { path: 'routes', component: RoutesPage, api: '/enfyra_route', field: 'path', base: [{ isSystem: { _eq: false } }, { mainTable: { _is_null: true } }] },
  { path: 'guards', component: GuardsPage, api: '/enfyra_guard', field: 'name', base: [{ parent: { _is_null: true } }, { type: { _eq: 'route' } }] },
  { path: 'flows', component: FlowsPage, api: '/enfyra_flow', field: 'name', base: [] },
  { path: 'extensions', component: ExtensionsPage, api: '/enfyra_extension', field: 'name', base: [] },
  { path: 'websockets', component: WebSocketsPage, api: '/enfyra_websocket', field: 'path', base: [] },
  { path: 'oauth/accounts', component: AccountsPage, api: '/enfyra_oauth_account', field: 'user.email', base: [] },
]
let wrapper: Awaited<ReturnType<typeof mountSuspended>> | undefined
beforeEach(() => {
  vi.clearAllMocks()
  state.allowed = false
  state.confirm.mockResolvedValue(true)
  state.remove.mockResolvedValue({ ok: true })
  state.requests = []
  state.data = ref({ data: [], meta: { totalCount: 90, filterCount: 2 } })
})
afterEach(() => { wrapper?.unmount(); wrapper = undefined })
function searchCondition(field: string, value: string) {
  return field === 'user.email' ? { user: { email: { _contains: value } } } : { [field]: { _contains: value } }
}
async function mountPage(entry: typeof cases[number], query = '') {
  wrapper = await mountSuspended(entry.component, { route: `/settings/${entry.path}${query}`, global: { stubs: { FilterDrawerLazy: true, CommonDrawer: true } } })
  await flushPromises()
  return wrapper
}
function request(entry: typeof cases[number]) {
  return state.requests.find(item => item.url === entry.api && !item.options.method)
}

describe.each(cases)('$path quick search', entry => {
  it('uses exactly the approved field and filtered count for a deep link', async () => {
    const page = await mountPage(entry, '?search=probe&page=2')
    const query = unref(request(entry).options.query)
    expect(query.filter).toEqual({ _and: [...entry.base, searchCondition(entry.field, 'probe')] })
    expect(query.page).toBe(2)
    expect(page.getComponent(SearchField).props('modelValue')).toBe('probe')
    expect(page.getComponent(SettingsTable).props('total')).toBe(2)
    expect(FILTER_OPERATORS.string.map(item => item.value)).toContain('_contains')
  })

  it('keeps the draft unsubmitted, resets the page on Search and preserves other query keys', async () => {
    const page = await mountPage(entry, '?page=3&keep=value')
    const api = request(entry)
    const requests = api.execute.mock.calls.length
    const search = page.getComponent(SearchField)
    search.vm.$emit('update:modelValue', '  probe  ')
    await flushPromises()
    expect(api.execute).toHaveBeenCalledTimes(requests)
    expect(unref(api.options.query).filter).toEqual(entry.base.length ? { _and: entry.base } : undefined)
    await page.get('form.eapp-search-field').trigger('submit')
    await expect.poll(() => useRouter().currentRoute.value.query).toEqual({ search: 'probe', keep: 'value' })
    expect(unref(api.options.query).page).toBe(1)
    expect(unref(api.options.query).filter).toEqual({ _and: [...entry.base, searchCondition(entry.field, 'probe')] })
    expect(api.execute).toHaveBeenCalledTimes(requests + 1)
    const submittedRequests = api.execute.mock.calls.length
    await page.get('form.eapp-search-field').trigger('submit')
    await flushPromises()
    expect(api.execute).toHaveBeenCalledTimes(submittedRequests + 1)
  })

  it('restores route history and clears only the search scope while preserving zero counts', async () => {
    const page = await mountPage(entry, '?search=probe')
    state.data.value = { data: [], meta: { totalCount: 90, filterCount: 0 } }
    await flushPromises()
    expect(page.getComponent(SettingsTable).props('total')).toBe(0)
    await useRouter().replace(`/settings/${entry.path}?search=history&keep=value`)
    await flushPromises()
    expect(page.getComponent(SearchField).props('modelValue')).toBe('history')
    page.getComponent(SearchField).vm.$emit('update:modelValue', '   ')
    await page.get('form.eapp-search-field').trigger('submit')
    await expect.poll(() => useRouter().currentRoute.value.query).toEqual({ keep: 'value' })
    expect(unref(request(entry).options.query).filter).toEqual(entry.base.length ? { _and: entry.base } : undefined)
    expect(page.getComponent(SettingsTable).props('total')).toBe(entry.base.length ? 0 : 90)
  })
})

describe('management bulk policies', () => {
  it('never allows system or collection routes and refreshes the global route/menu state', async () => {
    state.allowed = true
    state.data.value.data = [
      { id: 1, path: '/system', isSystem: true },
      { id: 2, path: '/records', mainTable: { id: 100 } },
      { id: 3, path: '/custom', isSystem: false, mainTable: null },
    ]
    const page = await mountPage(cases[1]!)
    const action = page.getComponent(SettingsTable).props('bulkAction')!
    expect(action.isEligible!(state.data.value.data[0])).toBe(false)
    expect(action.isEligible!(state.data.value.data[1])).toBe(false)
    expect(await action.execute(state.data.value.data)).toEqual([3])
    expect(state.remove).toHaveBeenCalledExactlyOnceWith({ id: 3 })
    expect(request(cases[1]!).execute).toHaveBeenCalledTimes(2)
    expect(state.loadRoutes).toHaveBeenCalledOnce()
    expect(state.registerMenus).toHaveBeenCalledOnce()
  })

  it('refreshes extension menus, cache and globals for confirmed deletions', async () => {
    state.allowed = true
    const record = { id: 3, name: 'Custom', extensionId: 'custom', menu: { path: '/custom' } }
    state.data.value.data = [{ id: 1, isSystem: true }, record]
    const page = await mountPage(cases[4]!)
    const action = page.getComponent(SettingsTable).props('bulkAction')!
    expect(await action.execute(state.data.value.data)).toEqual([3])
    expect(state.remove).toHaveBeenCalledExactlyOnceWith({ id: 3 })
    expect(state.invalidateExtension).toHaveBeenCalledWith({ reason: 'deleted', id: 3, extensionId: 'custom', path: '/custom' })
    expect(state.fetchMenus).toHaveBeenCalledOnce()
    expect(state.loadExtensions).toHaveBeenCalledWith({ forceReload: true })
  })

  it.each([0, 3, 5])('preserves system protection for management page %i', async index => {
    state.allowed = true
    const page = await mountPage(cases[index]!)
    const action = page.getComponent(SettingsTable).props('bulkAction')!
    expect(await action.execute([{ id: 1, isSystem: true }, { id: 2, isSystem: false }])).toEqual([2])
    expect(state.remove).toHaveBeenCalledExactlyOnceWith({ id: 2 })
  })

  it('keeps OAuth account inspection free of destructive actions even for privileged users', async () => {
    state.allowed = true
    state.data.value.data = [{ id: 1, provider: 'google', user: { email: 'test@example.invalid' } }]
    const page = await mountPage(cases[6]!)
    expect(page.getComponent(SettingsTable).props('bulkAction')).toBeUndefined()
    expect(page.find('tbody [role="checkbox"]').exists()).toBe(false)
    expect(state.requests.some(item => item.options.method === 'delete')).toBe(false)
  })
})

describe('quick search scope boundaries', () => {
  it('ignores repeated non-string query values rather than creating an invalid filter', async () => {
    const entry = cases[0]!
    const page = await mountPage(entry, '?search=first&search=second')
    expect(page.getComponent(SearchField).props('modelValue')).toBe('')
    expect(unref(request(entry).options.query).filter).toBeUndefined()
    expect(page.getComponent(SettingsTable).props('total')).toBe(90)
  })

  it('keeps search text as a field value rather than interpreting it as query syntax', async () => {
    const entry = cases[0]!
    const value = '{"_or":[{"isSystem":{"_eq":true}}]}'
    await mountPage(entry, `?search=${encodeURIComponent(value)}`)
    expect(unref(request(entry).options.query).filter).toEqual({ _and: [{ name: { _contains: value } }] })
  })

  it('keeps the Route Manager system/collection scope and complete advanced OR group', async () => {
    const entry = cases[1]!
    const page = await mountPage(entry, '?scope=all&collectionRoutes=true&search=/api')
    page.getComponent({ name: 'FilterDrawerLazy' }).vm.$emit('apply', { id: 'filter', operator: 'or', conditions: [
      { id: 'enabled', field: 'isEnabled', operator: '_eq', value: true },
      { id: 'system', field: 'isSystem', operator: '_eq', value: true },
    ] })
    await flushPromises()
    expect(unref(request(entry).options.query).filter).toEqual({ _and: [
      { _or: [{ isEnabled: { _eq: true } }, { isSystem: { _eq: true } }] },
      { path: { _contains: '/api' } },
    ] })
    expect(page.getComponent(SettingsTable).props('total')).toBe(2)
  })

  it('retains the name search when changing from Route to GraphQL guards', async () => {
    const entry = cases[2]!
    const page = await mountPage(entry, '?search=probe')
    await page.get('[role="tab"][id$="graphql"]').trigger('mousedown', { button: 0, ctrlKey: false })
    await flushPromises()
    expect(unref(request(entry).options.query).filter).toEqual({ _and: [
      { parent: { _is_null: true } }, { type: { _eq: 'graphql' } }, { name: { _contains: 'probe' } },
    ] })
  })
})
