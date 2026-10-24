import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { defineComponent, h, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useExtensionWarmup } from '~/composables/dynamic/prefetch'
import { extensionCacheInvalidation, invalidateExtensionCache } from '~/composables/dynamic/cache'
import { useAppActivity } from '~/composables/shared/useAppActivity'

const mocks = vi.hoisted(() => ({
  menus: null as any, user: null as any,
  initial: null as any, route: null as any, routes: null as any,
  menuPending: null as any, globalPending: null as any,
  fetch: vi.fn(), load: vi.fn(),
}))
mockNuxtImport('useMenuRegistry', () => () => ({ menuItems: mocks.menus ??= ref([]), findBestMenuMatch: () => null }))
mockNuxtImport('usePermissions', () => () => ({ hasMenuPermission: () => true }))
mockNuxtImport('useDatabase', () => () => ({ getIdFieldName: () => 'id' }))
mockNuxtImport('useInitialLoading', () => () => ({ initialReady: mocks.initial ??= ref(false) }))
mockNuxtImport('useGlobalState', () => () => ({ routeLoading: mocks.route ??= ref(false) }))
mockNuxtImport('useRoutes', () => () => ({ routesLoading: mocks.routes ??= ref(false) }))
mockNuxtImport('useMenuApi', () => () => ({ menuDefinitionsPending: mocks.menuPending ??= ref(false) }))
mockNuxtImport('useGlobalExtensions', () => () => ({ globalExtensionsPending: mocks.globalPending ??= ref(false) }))
mockNuxtImport('useAuth', () => () => ({ me: mocks.user ??= ref(null) }))
mockNuxtImport('useAuthFetch', () => mocks.fetch)
mockNuxtImport('useDynamicComponent', () => () => ({
  getCachedExtensionMeta: () => null, setCachedExtensionMeta: vi.fn(),
  loadDynamicComponent: mocks.load, isComponentCached: () => false,
  extensionCacheInvalidation,
}))

const Harness = defineComponent({ setup() { useExtensionWarmup(); return () => h('div') } })
const extension = { id: 1, extensionId: 'reports-warmup', type: 'page', name: 'Reports', isEnabled: true, compiledCode: 'window.reports = {}', updatedAt: '2026-10-23T00:00:00.000Z' }

describe('shell extension warmup', () => {
  beforeEach(() => {
    mocks.menus = ref([{ id: '1', route: '/reports-warmup', isEnabled: true, label: 'Reports' }])
    mocks.user = ref({ roles: [], isRootAdmin: true })
    mocks.initial = ref(false)
    mocks.route = ref(false)
    mocks.routes = ref(false)
    mocks.menuPending = ref(false)
    mocks.globalPending = ref(false)
    mocks.fetch.mockReset().mockResolvedValue({ data: [{ extension }] })
    mocks.load.mockReset().mockResolvedValue({})
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true })
    vi.stubGlobal('requestIdleCallback', undefined)
  })
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks() })
  const settle = async () => { for (let i = 0; i < 5; i++) await vi.advanceTimersByTimeAsync(650) }

  it('watches invalidation through its value without Vue invalid-source warnings', async () => {
    const warn = vi.spyOn(console, 'warn')
    const wrapper = await mountSuspended(Harness)
    try {
      expect(warn.mock.calls.flat().join(' ')).not.toContain('Invalid watch source')
      invalidateExtensionCache({ reason: 'updated' })
      expect(warn.mock.calls.flat().join(' ')).not.toContain('Invalid watch source')
    } finally { wrapper.unmount() }
  })

  it('pauses speculative preparation while offline and with data saver enabled', async () => {
    const connection = Object.assign(new EventTarget(), { saveData: true, effectiveType: '4g' })
    Object.defineProperty(navigator, 'connection', { configurable: true, value: connection })
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false })
    const wrapper = await mountSuspended(Harness)
    vi.useFakeTimers()
    try {
      mocks.initial.value = true
      await settle()
      expect(mocks.fetch).not.toHaveBeenCalled()
      Object.defineProperty(navigator, 'onLine', { configurable: true, value: true })
      window.dispatchEvent(new Event('online'))
      await settle()
      expect(mocks.fetch).not.toHaveBeenCalled()
      connection.saveData = false
      connection.dispatchEvent(new Event('change'))
      await settle()
      expect(mocks.fetch).toHaveBeenCalledOnce()
    } finally { wrapper.unmount(); Reflect.deleteProperty(navigator, 'connection') }
  })

  it('waits for foreground page data requests before preparing other pages', async () => {
    const wrapper = await mountSuspended(Harness)
    vi.useFakeTimers()
    const endRequest = useAppActivity().beginRequest()
    try {
      mocks.initial.value = true
      await settle()
      expect(mocks.fetch).not.toHaveBeenCalled()
      endRequest()
      await settle()
      expect(mocks.fetch).toHaveBeenCalledOnce()
    } finally { endRequest(); wrapper.unmount() }
  })

  it('waits for boot and foreground metadata, then pauses while the tab is hidden', async () => {
    const wrapper = await mountSuspended(Harness)
    vi.useFakeTimers()
    try {
      await settle()
      expect(mocks.fetch).not.toHaveBeenCalled()
      mocks.routes.value = true
      mocks.initial.value = true
      await settle()
      expect(mocks.fetch).not.toHaveBeenCalled()
      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' })
      document.dispatchEvent(new Event('visibilitychange'))
      mocks.routes.value = false
      await settle()
      expect(mocks.fetch).not.toHaveBeenCalled()
      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
      document.dispatchEvent(new Event('visibilitychange'))
      await settle()
      expect(mocks.fetch).toHaveBeenCalledOnce()
      expect(mocks.load).toHaveBeenCalledOnce()
    } finally { wrapper.unmount() }
  })
})
