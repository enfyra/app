import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { useRouter } from '#app'
import { ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ request: vi.fn(), navigateTo: vi.fn() }))
mockNuxtImport('useSubHeaderActionRegistry', () => () => ({ register: vi.fn() }))
mockNuxtImport('useHeaderActionRegistry', () => () => ({ register: vi.fn() }))
mockNuxtImport('usePageHeaderRegistry', () => () => ({ registerPageHeader: vi.fn() }))
mockNuxtImport('useSettingsPageSize', () => () => ref(10))
mockNuxtImport('navigateTo', () => mocks.navigateTo)
mockNuxtImport('useDatabase', () => () => ({ getId: (row: Record<string, unknown>) => row.id ?? row._id, getIdFieldName: () => 'id' }))
mockNuxtImport('useApi', () => (_url: unknown, options: unknown) => {
  mocks.request(options)
  const data = ref({ data: [{
    id: 78,
    name: 'probe_collection',
    description: 'Collection description',
    isSystem: false,
    createdAt: '2026-09-19T00:00:00Z',
    columns: Array.from({ length: 12 }, (_, id) => ({ id })),
    relations: [{ id: 1 }, { id: 2 }],
  }], meta: { filterCount: 12, totalCount: 99 } })
  return { data, pending: ref(false), execute: vi.fn().mockResolvedValue(data.value) }
})

import CollectionsPage from '~/pages/collections/index.vue'
import SettingsTable from '~/components/data-table/SettingsTable.vue'

describe('Collections table', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders collection metadata in native table columns and opens the clicked record', async () => {
    const wrapper = await mountSuspended(CollectionsPage, { route: '/collections' })
    await flushPromises()
    const headers = wrapper.get('thead').text()
    for (const label of ['ID', 'Collection', 'Description', 'Fields', 'API path', 'Type', 'Created']) expect(headers).toContain(label)
    const row = wrapper.get('tbody tr')
    expect(row.text()).toContain('probe_collection')
    expect(row.text()).toContain('Collection description')
    expect(row.text()).toContain('14')
    expect(row.text()).toContain('/probe_collection')
    expect(row.text()).toContain('Custom')
    const query = mocks.request.mock.calls[0]![0].query.value
    expect(query.deep).toEqual({ columns: { limit: 0 }, relations: { limit: 0 } })
    expect(query.filter).toEqual({ _and: [{ isSystem: { _eq: false } }] })
    await row.trigger('click')
    expect(mocks.navigateTo).toHaveBeenCalledWith('/collections/probe_collection')
    wrapper.unmount()
  })

  it('uses the filtered count and resets the URL page when changing page size', async () => {
    const wrapper = await mountSuspended(CollectionsPage, { route: '/collections?page=2&search=probe&scope=all' })
    await flushPromises()
    expect(wrapper.get('.eapp-settings-pagination').text()).toContain('11–12 / 12')
    wrapper.getComponent(SettingsTable).vm.$emit('page-size-change', 20)
    await expect.poll(() => mocks.request.mock.calls[0]![0].query.value.limit).toBe(20)
    expect(useRouter().currentRoute.value.query).toMatchObject({ search: 'probe', scope: 'all' })
    expect(useRouter().currentRoute.value.query.page).toBeUndefined()
    expect(mocks.request.mock.calls[0]![0].query.value.page).toBe(1)
    expect(mocks.request.mock.calls[0]![0].query.value.filter).toEqual({ _and: [{ name: { _contains: 'probe' } }] })
    wrapper.unmount()
  })
})
