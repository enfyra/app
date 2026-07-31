import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { defineComponent, markRaw, ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import CommonRouteLoading from '~/components/common/RouteLoading.vue'
import DynamicPageComponent from '~/components/dynamic/PageComponent.vue'

const mocks = vi.hoisted(() => ({
  beginRouteLoading: vi.fn(),
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

mockNuxtImport('useApi', () => () => ({
  data: mocks.menuResponse,
  error: mocks.menuError,
  execute: mocks.executeFetchMenu,
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
    mocks.executeFetchMenu.mockResolvedValue(mocks.menuResponse.value)
    mocks.beginRouteLoading.mockReturnValue(mocks.endRouteLoading)
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
