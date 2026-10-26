import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import type { MenuItem } from '~/types/menu'

const mocks = vi.hoisted(() => ({
  fetch: vi.fn(), load: vi.fn(), menus: null as any, allowed: true,
  findMatch: vi.fn(), meta: new Map(), generation: 0, idField: 'id',
}))
mockNuxtImport('useAuthFetch', () => mocks.fetch)
mockNuxtImport('useMenuRegistry', () => () => ({ menuItems: mocks.menus, findBestMenuMatch: mocks.findMatch }))
mockNuxtImport('usePermissions', () => () => ({ hasMenuPermission: () => mocks.allowed }))
mockNuxtImport('useDatabase', () => () => ({ getIdFieldName: () => mocks.idField }))
mockNuxtImport('useDynamicComponent', () => () => ({
  getCachedExtensionMeta: (key: string) => mocks.meta.get(key),
  setCachedExtensionMeta: (key: string, value: unknown) => mocks.meta.set(key, value),
  loadDynamicComponent: mocks.load,
  isComponentCached: () => false,
}))

import { useExtensionPrefetch } from '~/composables/dynamic/prefetch'
import { invalidateExtensionCache } from '~/composables/dynamic/cache'

const extension = { id: 2, name: 'Reports', extensionId: 'reports', type: 'page', isEnabled: true, compiledCode: 'window.reports = {}', updatedAt: '2026-10-23T00:00:00.000Z' }
const menu: MenuItem = { id: 'menu-2', route: '/reports', label: 'Reports', isEnabled: true }
const flush = async () => { for (let i = 0; i < 25; i++) await Promise.resolve() }

describe('progressive extension loading', () => {
  let controller: ReturnType<typeof useExtensionPrefetch>
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('requestIdleCallback', undefined)
    mocks.allowed = true
    mocks.idField = 'id'
    mocks.meta.clear()
    mocks.menus = ref([menu])
    mocks.findMatch.mockReturnValue({ item: menu })
    mocks.fetch.mockReset().mockResolvedValue({ data: [{ extension }] })
    mocks.load.mockReset().mockResolvedValue({})
    controller = useExtensionPrefetch()
  })
  afterEach(() => {
    controller.dispose()
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })
  const warm = async () => {
    for (let i = 0; i < 5; i++) { await vi.advanceTimersByTimeAsync(650); await flush() }
  }

  it('does not fetch or execute before boot readiness, then prepares without mounting', async () => {
    const pending = controller.prefetchForPath('/reports')
    await warm()
    expect(mocks.fetch).not.toHaveBeenCalled()
    expect(mocks.load).not.toHaveBeenCalled()
    controller.setReady(true)
    await warm()
    await pending
    expect(mocks.fetch).toHaveBeenCalledOnce()
    expect(mocks.load).toHaveBeenCalledOnce()
    expect(mocks.load.mock.calls[0]?.[0]).toBe(extension.compiledCode)
    expect(mocks.meta.get('menu:menu-2')).toEqual(extension)
  })

  it('warms every eligible menu without stopping at a retention limit', async () => {
    mocks.menus.value = Array.from({ length: 75 }, (_, index) => ({
      ...menu, id: String(index), route: `/warm-all-${index}`,
    }))
    mocks.findMatch.mockReturnValue(null)
    mocks.fetch.mockImplementation(async (_url, options) => {
      const id = options.query.filter._and[0].id._eq
      return { data: [{ extension: { ...extension, id, extensionId: `extension-${id}` } }] }
    })
    controller.setReady(true)
    controller.refreshCandidates()
    await vi.runAllTimersAsync()
    expect(mocks.fetch).toHaveBeenCalledTimes(75)
    expect(mocks.load).toHaveBeenCalledTimes(75)
    expect(mocks.meta.size).toBe(75)
    for (let i = 0; i < 75; i++) expect(mocks.meta.has(`menu:${i}`)).toBe(true)
  })

  it('never fetches or executes a menu the current user cannot access', async () => {
    mocks.allowed = false
    controller.setReady(true)
    await controller.prefetchForPath('/reports')
    await warm()
    expect(mocks.fetch).not.toHaveBeenCalled()
    expect(mocks.load).not.toHaveBeenCalled()
  })

  it('does not run a queued menu after it is removed from the registry', async () => {
    controller.setReady(true)
    const pending = controller.prefetchForPath('/reports')
    mocks.menus.value = []
    await warm()
    await pending
    expect(mocks.fetch).not.toHaveBeenCalled()
    expect(mocks.load).not.toHaveBeenCalled()
  })

  it('checks permissions again between metadata and script preparation', async () => {
    mocks.fetch.mockImplementation(async () => { mocks.allowed = false; return { data: [{ extension }] } })
    controller.setReady(true)
    const pending = controller.prefetchForPath('/reports')
    await warm()
    await pending
    expect(mocks.fetch).toHaveBeenCalledOnce()
    expect(mocks.load).not.toHaveBeenCalled()
  })

  it('shares an in-flight metadata request with foreground navigation', async () => {
    let finish!: (value: unknown) => void
    mocks.fetch.mockImplementation(() => new Promise(resolve => { finish = resolve }))
    controller.setReady(true)
    const warmup = controller.prefetchForPath('/reports')
    await vi.advanceTimersByTimeAsync(650)
    const end = controller.beginForeground('menu:menu-2')
    const foreground = controller.loadMenuExtension('menu-2')
    finish({ data: [{ extension }] })
    await flush()
    expect(await foreground).toEqual(extension)
    await warmup
    expect(mocks.fetch).toHaveBeenCalledOnce()
    end()
  })

  it('rejects old metadata after invalidation instead of refilling the cache', async () => {
    let finish!: (value: unknown) => void
    mocks.fetch.mockImplementation(() => new Promise(resolve => { finish = resolve }))
    const pending = controller.loadMenuExtension('menu-2')
    const assertion = expect(pending).rejects.toThrow('Extension metadata changed')
    invalidateExtensionCache({ reason: 'updated' })
    controller.invalidate()
    finish({ data: [{ extension }] })
    await assertion
    expect(mocks.meta.size).toBe(0)
    expect(mocks.load).not.toHaveBeenCalled()
  })

  it('uses the Mongo primary key for menu metadata and does not request source code', async () => {
    mocks.idField = '_id'
    await controller.loadMenuExtension('mongo-menu')
    const options = mocks.fetch.mock.calls[0]?.[1]
    expect(options.query.filter._and[0]).toEqual({ _id: { _eq: 'mongo-menu' } })
    expect(options.query.fields.split(',')).toContain('extension.compiledCode')
    expect(options.query.fields.split(',')).not.toContain('extension.code')
  })

  it('keeps disabled extensions out of the runtime', async () => {
    mocks.fetch.mockResolvedValue({ data: [{ extension: { ...extension, isEnabled: false } }] })
    controller.setReady(true)
    const pending = controller.prefetchForPath('/reports')
    await warm()
    await pending
    expect(mocks.load).not.toHaveBeenCalled()
  })
})
