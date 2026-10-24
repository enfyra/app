import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { defineComponent, markRaw, ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import CommonRouteLoading from '~/components/common/RouteLoading.vue'
import DynamicPageComponent from '~/components/dynamic/PageComponent.vue'

const mocks = vi.hoisted(() => ({
  beginRouteLoading: vi.fn(),
  beginForeground: vi.fn(),
  endForeground: vi.fn(),
  cachedComponent: null as any,
  cachedMeta: null as any,
  endRouteLoading: vi.fn(),
  executeFetchMenu: vi.fn(),
  extensionCacheInvalidation: null as any,
  loadDynamicComponent: vi.fn(),
  menuError: null as any,
  menuResponse: null as any,
}))

mockNuxtImport('useDynamicComponent', () => () => ({
  loadDynamicComponent: mocks.loadDynamicComponent,
  getCachedComponent: () => mocks.cachedComponent,
  getCachedExtensionMeta: () => mocks.cachedMeta,
  setCachedExtensionMeta: vi.fn(),
  extensionCacheInvalidation: mocks.extensionCacheInvalidation,
  isExtensionInvalidationMatch: vi.fn(() => false),
}))

mockNuxtImport('useGlobalState', () => () => ({
  beginRouteLoading: mocks.beginRouteLoading,
}))

mockNuxtImport('useMenuRegistry', () => () => ({
  findBestMenuMatch: () => ({
    item: {
      id: 'menu-1',
      path: '/reports',
      permission: { allowAll: true },
    },
  }),
}))

mockNuxtImport('useExtensionPerf', () => () => ({
  time: (_label: string, callback: () => unknown) => callback(),
}))

mockNuxtImport('useExtensionPrefetch', () => () => ({
  beginForeground: mocks.beginForeground,
  loadMenuExtension: (...args: unknown[]) => mocks.executeFetchMenu(...args),
}))

describe('DynamicPageComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.cachedMeta = {
      id: 'extension-1',
      extensionId: 'reports-page',
      isEnabled: true,
      name: 'Reports',
      updatedAt: '2026-07-27T00:00:00.000Z',
    }
    mocks.cachedComponent = markRaw(defineComponent({
      template: '<div data-testid="cached-extension">Cached extension</div>',
    }))
    mocks.extensionCacheInvalidation = ref(null)
    mocks.menuError = ref(null)
    mocks.menuResponse = ref({
      data: [{
        id: 'menu-1',
        extension: mocks.cachedMeta,
        permission: { allowAll: true },
      }],
    })
    mocks.executeFetchMenu.mockImplementation(async () => mocks.menuResponse.value?.data?.[0]?.extension ?? null)
    mocks.beginRouteLoading.mockReturnValue(mocks.endRouteLoading)
    mocks.beginForeground.mockReturnValue(mocks.endForeground)
  })

  it('renders a cached extension without activating the navigation overlay', async () => {
    const wrapper = await mountSuspended(DynamicPageComponent, {
      route: '/reports',
      props: { path: 'reports' },
      global: {
        stubs: {
          PermissionGate: defineComponent({
            template: '<div><slot /></div>',
          }),
        },
      },
    })

    expect(wrapper.get('[data-testid="cached-extension"]').text()).toBe('Cached extension')
    expect(mocks.executeFetchMenu).toHaveBeenCalledTimes(1)
    expect(mocks.beginRouteLoading).not.toHaveBeenCalled()
  })

  it('reports an empty menu response without attempting extension execution', async () => {
    mocks.cachedMeta = null
    mocks.cachedComponent = null
    mocks.menuResponse.value = { data: [] }
    const wrapper = await mountSuspended(DynamicPageComponent, {
      route: '/reports',
      props: { path: 'reports' },
      global: { stubs: { PermissionGate: defineComponent({ template: '<div><slot /></div>' }) } },
    })
    try {
      expect(wrapper.text()).toContain('No extension found for route: /reports')
      expect(mocks.loadDynamicComponent).not.toHaveBeenCalled()
      expect(mocks.endRouteLoading).toHaveBeenCalledOnce()
    } finally { wrapper.unmount() }
  })

  it('restarts an in-flight page when shared metadata invalidation cancels its request', async () => {
    mocks.cachedMeta = null
    mocks.cachedComponent = null
    let rejectOld!: (error: Error) => void
    mocks.executeFetchMenu.mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectOld = reject }))
    const wrapper = await mountSuspended(DynamicPageComponent, { route: '/reports', props: { path: 'reports' } })
    try {
      await vi.waitFor(() => expect(mocks.executeFetchMenu).toHaveBeenCalledOnce())
      const extension = { extensionId: 'reports', name: 'Reports', isEnabled: true, compiledCode: 'compiled', updatedAt: '2026-10-23' }
      mocks.executeFetchMenu.mockResolvedValue(extension)
      mocks.loadDynamicComponent.mockResolvedValue(markRaw(defineComponent({ template: '<div data-testid="revalidated-page">Ready</div>' })))
      mocks.extensionCacheInvalidation.value = { token: 1, reason: 'updated', extensionId: 'other-page' }
      await vi.waitFor(() => expect(mocks.executeFetchMenu).toHaveBeenCalledTimes(2))
      rejectOld(new DOMException('metadata invalidated', 'AbortError'))
      await vi.waitFor(() => expect(wrapper.find('[data-testid="revalidated-page"]').exists()).toBe(true))
      expect(wrapper.text()).not.toContain('Failed to load extension')
    } finally { wrapper.unmount() }
  })

  it('uses prefetched code before a slow metadata revalidation', async () => {
    const warmMeta = { ...mocks.cachedMeta, compiledCode: 'compiled reports' }
    mocks.cachedComponent = null
    mocks.cachedMeta = warmMeta
    const component = markRaw(defineComponent({ template: '<div data-testid="prefetched-page">Ready</div>' }))
    mocks.loadDynamicComponent.mockResolvedValue(component)
    let finish!: () => void
    mocks.executeFetchMenu.mockResolvedValueOnce(warmMeta).mockImplementationOnce(() => new Promise(resolve => {
      finish = () => resolve(warmMeta)
    }))
    const wrapper = await mountSuspended(DynamicPageComponent, { route: '/reports', props: { path: 'reports' } })
    try {
      await vi.waitFor(() => expect(wrapper.find('[data-testid="prefetched-page"]').exists()).toBe(true))
      expect(mocks.executeFetchMenu).toHaveBeenNthCalledWith(1, 'menu-1', false)
      expect(mocks.executeFetchMenu).toHaveBeenNthCalledWith(2, 'menu-1', true)
      expect(mocks.endRouteLoading).toHaveBeenCalled()
      finish()
    } finally { finish?.(); wrapper.unmount() }
  })

  it('activates and releases the navigation overlay for a cold extension load', async () => {
    const coldMeta = {
      ...mocks.cachedMeta,
      compiledCode: 'window.reports-page = {}',
    }
    const coldComponent = markRaw(defineComponent({
      template: '<div data-testid="cold-extension">Cold extension</div>',
    }))
    mocks.cachedMeta = null
    mocks.cachedComponent = null
    mocks.menuResponse.value = {
      data: [{
        id: 'menu-1',
        extension: coldMeta,
        permission: { allowAll: true },
      }],
    }
    mocks.loadDynamicComponent.mockResolvedValue(coldComponent)

    const wrapper = await mountSuspended(DynamicPageComponent, {
      route: '/reports',
      props: { path: 'reports' },
      global: {
        stubs: {
          PermissionGate: defineComponent({
            template: '<div><slot /></div>',
          }),
        },
      },
    })

    expect(wrapper.get('[data-testid="cold-extension"]').text()).toBe('Cold extension')
    expect(mocks.beginRouteLoading).toHaveBeenCalledTimes(1)
    expect(mocks.endRouteLoading).toHaveBeenCalledTimes(1)
  })
})

describe('CommonRouteLoading', () => {
  it('renders a workspace-scoped translucent overlay without teleporting', async () => {
    const wrapper = await mountSuspended(CommonRouteLoading, {
      props: { show: true, message: 'Navigating...' },
    })
    const overlay = wrapper.find('[role="status"]')

    expect(overlay.exists()).toBe(true)
    expect(overlay.classes()).toContain('absolute')
    expect(overlay.classes()).toContain('inset-0')
    expect(overlay.classes()).toContain('pointer-events-none')
    expect(overlay.classes().join(' ')).toContain('var(--shell-main-bg)')
    expect(document.body.querySelector('.fixed.inset-0')).toBeNull()

    wrapper.unmount()
  })
})
