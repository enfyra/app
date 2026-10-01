import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref, unref } from 'vue'
import ApiTester from '~/pages/settings/api-tester/index.vue'

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
  })
})
