import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { useRouter } from '#app'
import { ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import SettingsTable from '~/components/data-table/SettingsTable.vue'
import SearchField from '~/components/common/SearchField.vue'
import { FILTER_OPERATORS } from '~/utils/common/filter/filter-operators'

const mocks = vi.hoisted(() => ({ request: vi.fn(), fetch: vi.fn(), data: undefined as any }))
mockNuxtImport('useHeaderActionRegistry', () => () => ({ register: vi.fn() }))
mockNuxtImport('usePageHeaderRegistry', () => () => ({ registerPageHeader: vi.fn() }))
mockNuxtImport('useSettingsPageSize', () => () => ref(10))
mockNuxtImport('useConfirm', () => () => ({ confirm: vi.fn() }))
mockNuxtImport('useNotify', () => () => ({ success: vi.fn(), error: vi.fn() }))
mockNuxtImport('usePermissions', () => () => ({ hasPermission: () => false }))
mockNuxtImport('useDatabase', () => () => ({ getId: (row: Record<string, unknown>) => row.id ?? row._id, getIdFieldName: () => 'id' }))
mockNuxtImport('useApi', () => (_url: unknown, options: any) => {
  mocks.request(options)
  return { data: mocks.data, pending: ref(false), execute: () => mocks.fetch(options.query.value) }
})

import UsersPage from '~/pages/settings/users/index.vue'

let wrapper: Awaited<ReturnType<typeof mountSuspended>> | undefined
beforeEach(() => {
  vi.clearAllMocks()
  mocks.data = ref({ data: [{ id: 1, name: 'Example', email: 'example@test.invalid', roles: [] }], meta: { totalCount: 90, filterCount: 2 } })
  mocks.fetch.mockResolvedValue(mocks.data.value)
})
afterEach(() => { wrapper?.unmount(); wrapper = undefined })

async function mountUsers(route = '/settings/users') {
  wrapper = await mountSuspended(UsersPage, { route, global: { stubs: { FilterDrawerLazy: true } } })
  await flushPromises()
  return wrapper
}

function query() {
  return mocks.request.mock.calls[0]![0].query.value
}

describe('Users email search', () => {
  it('renders the shared search field without filtering before submission', async () => {
    const page = await mountUsers()
    expect(page.getComponent(SearchField).props('label')).toBe('Search users by email')
    expect(page.getComponent(SearchField).props('placeholder')).toBe('Search by email')
    expect(page.get('[aria-live="polite"]').text()).toBe('90 records')
    expect(query().filter).toBeUndefined()
    expect(query().fields).toBe('id,name,email,isRootAdmin,createdAt,roles.id,roles.name')
    const requests = mocks.fetch.mock.calls.length
    await page.get('input[aria-label="Search users by email"]').setValue('Example@')
    expect(query().filter).toBeUndefined()
    expect(mocks.fetch).toHaveBeenCalledTimes(requests)
  })

  it('submits an email substring, resets pagination and preserves unrelated URL fields', async () => {
    const page = await mountUsers('/settings/users?page=3&keep=value')
    await page.get('input[aria-label="Search users by email"]').setValue('  Example@  ')
    await page.get('form.eapp-search-field').trigger('submit')
    await flushPromises()
    await expect.poll(() => useRouter().currentRoute.value.query).toEqual({ search: 'Example@', keep: 'value' })
    expect(query().page).toBe(1)
    expect(query().filter).toEqual({ _and: [{ email: { _contains: 'Example@' } }] })
    const operator = Object.keys(query().filter._and[0].email)[0]
    expect(FILTER_OPERATORS.string.map(item => item.value)).toContain(operator)
    expect(page.get('[aria-live="polite"]').text()).toBe('2 records')
  })

  it('restores search from deep links and browser route changes', async () => {
    const page = await mountUsers('/settings/users?search=first&page=2')
    expect(page.getComponent(SearchField).props('modelValue')).toBe('first')
    expect(query().page).toBe(2)
    expect(query().filter).toEqual({ _and: [{ email: { _contains: 'first' } }] })
    await useRouter().replace('/settings/users?search=second')
    await flushPromises()
    expect(page.getComponent(SearchField).props('modelValue')).toBe('second')
    expect(query().page).toBe(1)
    expect(query().filter).toEqual({ _and: [{ email: { _contains: 'second' } }] })
    expect(mocks.fetch.mock.calls.at(-1)![0].filter).toEqual(query().filter)
  })

  it('combines email search with advanced filters without changing their OR scope', async () => {
    const page = await mountUsers('/settings/users?search=example')
    const filter = { id: 'users-filter', operator: 'or', conditions: [
      { id: 'name', field: 'name', operator: '_eq', value: 'Example' },
      { id: 'root', field: 'isRootAdmin', operator: '_eq', value: false },
    ] }
    page.getComponent({ name: 'FilterDrawerLazy' }).vm.$emit('apply', filter)
    await flushPromises()
    const advanced = { _or: [{ name: { _eq: 'Example' } }, { isRootAdmin: { _eq: false } }] }
    expect(query().filter).toEqual({ _and: [advanced, { email: { _contains: 'example' } }] })
    await page.get('input[aria-label="Search users by email"]').setValue('   ')
    await page.get('form.eapp-search-field').trigger('submit')
    await flushPromises()
    await expect.poll(() => useRouter().currentRoute.value.query.search).toBeUndefined()
    expect(query().filter).toEqual({ _and: [advanced] })
    expect(page.getComponent(SettingsTable).props('total')).toBe(2)
  })

  it('retains a filtered zero count and restores the unfiltered total when search clears', async () => {
    const page = await mountUsers('/settings/users?search=missing')
    mocks.data.value = { data: [], meta: { totalCount: 90, filterCount: 0 } }
    await flushPromises()
    expect(page.getComponent(SettingsTable).props('total')).toBe(0)
    expect(page.get('[aria-live="polite"]').text()).toBe('0 records')
    await page.get('input[aria-label="Search users by email"]').setValue('')
    await page.get('form.eapp-search-field').trigger('submit')
    await flushPromises()
    await expect.poll(() => query().filter).toBeUndefined()
    expect(page.getComponent(SettingsTable).props('total')).toBe(90)
  })

  it('refreshes the same submitted search without changing the URL', async () => {
    const page = await mountUsers('/settings/users?search=example')
    const requests = mocks.fetch.mock.calls.length
    await page.get('form.eapp-search-field').trigger('submit')
    await flushPromises()
    expect(mocks.fetch).toHaveBeenCalledTimes(requests + 1)
    expect(useRouter().currentRoute.value.query).toEqual({ search: 'example' })
  })
})
