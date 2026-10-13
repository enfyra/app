import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref, unref } from 'vue'
import ApiTester from '~/pages/settings/api-tester/index.vue'
import SearchField from '~/components/common/SearchField.vue'
import { useRouter } from '#app'

const mocks = vi.hoisted(() => ({
  execute: vi.fn(),
  query: null as any,
}))

mockNuxtImport('useApi', () => (_path: string, options: any) => {
  mocks.query = options.query
  return {
    data: ref({ data: [{ id: 1, path: '/enfyra_route', isSystem: true, isEnabled: true, description: 'Route', availableMethods: [{ name: 'GET' }] }], meta: { filterCount: 34 } }),
    pending: ref(false),
    execute: mocks.execute,
  }
})
mockNuxtImport('useSchema', () => () => ({ schemas: ref({}) }))
mockNuxtImport('usePageHeaderRegistry', () => () => ({ registerPageHeader: vi.fn() }))

describe('API Tester route table', () => {
  beforeEach(() => { vi.clearAllMocks(); localStorage.clear() })

  it('mounts system routes with a bounded request and compact rows', async () => {
    const wrapper = await mountSuspended(ApiTester, {
      route: '/settings/api-tester?scope=system&page=2',
      global: { stubs: { RouteApiTestModal: true } },
    })
    await flushPromises()
    expect(mocks.execute).toHaveBeenCalledTimes(1)
    expect(mocks.query).not.toBeNull()
    expect(unref(mocks.query).limit).toBe(10)
    expect(unref(mocks.query).page).toBe(2)
    expect(unref(mocks.query).filter._and[0].isSystem._eq).toBe(true)
    expect(unref(mocks.query).meta).toBe('filterCount')
    expect(wrapper.get('tbody').text()).toContain('/enfyra_route')
    expect(wrapper.get('tbody td').classes()).toContain('py-2')
    wrapper.unmount()
  })

  it('searches only the route path and retains the selected scope', async () => {
    const wrapper = await mountSuspended(ApiTester, {
      route: '/settings/api-tester?scope=system&search=/enfyra&page=2&keep=value',
      global: { stubs: { RouteApiTestModal: true } },
    })
    try {
      await flushPromises()
      expect(unref(mocks.query).filter).toEqual({ _and: [{ isSystem: { _eq: true } }, { path: { _contains: '/enfyra' } }] })
      expect(wrapper.findAllComponents(SearchField).find(component => component.isVisible())!.props('modelValue')).toBe('/enfyra')
      expect(wrapper.findAll('form.eapp-search-field')).toHaveLength(2)
      for (const table of wrapper.findAllComponents({ name: 'DataTableSettingsTable' })) {
        expect(table.findAll('form.eapp-search-field')).toHaveLength(1)
      }
      const requests = mocks.execute.mock.calls.length
      wrapper.findAllComponents(SearchField).find(component => component.isVisible())!.vm.$emit('update:modelValue', '  /next  ')
      await flushPromises()
      expect(mocks.execute).toHaveBeenCalledTimes(requests)
      await wrapper.findAll('form.eapp-search-field').find(form => form.isVisible())!.trigger('submit')
      await expect.poll(() => useRouter().currentRoute.value.query).toEqual({ scope: 'system', search: '/next', keep: 'value' })
      expect(unref(mocks.query).page).toBe(1)
      expect(unref(mocks.query).filter).toEqual({ _and: [{ isSystem: { _eq: true } }, { path: { _contains: '/next' } }] })
      expect(mocks.execute).toHaveBeenCalledTimes(requests + 1)
      wrapper.findAllComponents(SearchField).find(component => component.isVisible())!.vm.$emit('update:modelValue', '')
      await wrapper.findAll('form.eapp-search-field').find(form => form.isVisible())!.trigger('submit')
      await expect.poll(() => useRouter().currentRoute.value.query.search).toBeUndefined()
      expect(unref(mocks.query).filter).toEqual({ _and: [{ isSystem: { _eq: true } }] })
    } finally { wrapper.unmount() }
  })

  it('restores the search draft on route history changes', async () => {
    const wrapper = await mountSuspended(ApiTester, {
      route: '/settings/api-tester?search=/first',
      global: { stubs: { RouteApiTestModal: true } },
    })
    try {
      await useRouter().replace('/settings/api-tester?search=/history')
      await flushPromises()
      expect(wrapper.findAllComponents(SearchField).find(component => component.isVisible())!.props('modelValue')).toBe('/history')
      expect(unref(mocks.query).filter).toEqual({ _and: [{ isSystem: { _eq: false } }, { path: { _contains: '/history' } }] })
    } finally { wrapper.unmount() }
  })
})
