import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  clearCache, getCachedComponent, getExtensionCacheGeneration, getCacheStats,
  invalidateExtensionCache, setCachedComponent, isComponentCached,
  extensionMetaCache, setCachedExtensionMeta, getCachedExtensionMeta,
} from '~/composables/dynamic/cache'

const updatedAt = '2026-10-23T00:00:00.000Z'

describe('extension component cache', () => {
  beforeEach(() => { clearCache(); extensionMetaCache.value.clear() })
  afterEach(() => { clearCache(); extensionMetaCache.value.clear() })

  it('retains every loaded component without count-based eviction', () => {
    for (let i = 0; i < 200; i++) setCachedComponent(`page-${i}`, { i }, updatedAt)
    expect(getCacheStats().size).toBe(200)
    for (let i = 0; i < 200; i++) expect(getCachedComponent(`page-${i}`, updatedAt)).toEqual({ i })
  })

  it('retains compiled metadata for all menu and widget entries', () => {
    for (let i = 0; i < 200; i++) {
      setCachedExtensionMeta(`menu:${i}`, { id: i })
      setCachedExtensionMeta(`widget:${i}`, { id: i })
    }
    expect(extensionMetaCache.value.size).toBe(400)
    for (let i = 0; i < 200; i++) {
      expect(getCachedExtensionMeta(`menu:${i}`)).toEqual({ id: i })
      expect(getCachedExtensionMeta(`widget:${i}`)).toEqual({ id: i })
    }
  })

  it('replaces the previous version of the same extension rather than accumulating versions', () => {
    setCachedComponent('reports', { version: 'old' }, updatedAt)
    const latest = '2026-10-24T00:00:00.000Z'
    setCachedComponent('reports', { version: 'latest' }, latest)
    expect(getCacheStats().size).toBe(1)
    expect(isComponentCached('reports', updatedAt)).toBe(false)
    expect(getCachedComponent('reports', latest)).toEqual({ version: 'latest' })
  })

  it('invalidates only the matching extension without evicting other loaded pages', () => {
    setCachedComponent('reports', {}, updatedAt)
    setCachedComponent('orders', {}, updatedAt)
    setCachedExtensionMeta('menu:reports', { id: 1, extensionId: 'reports' })
    setCachedExtensionMeta('menu:orders', { id: 2, extensionId: 'orders' })
    invalidateExtensionCache({ reason: 'updated', extensionId: 'reports' })
    expect(getCachedComponent('reports', updatedAt)).toBeNull()
    expect(getCachedExtensionMeta('menu:reports')).toBeUndefined()
    expect(getCachedComponent('orders', updatedAt)).toEqual({})
    expect(getCachedExtensionMeta('menu:orders')).toEqual({ id: 2, extensionId: 'orders' })
  })

  it('changes the publication fence and clears all entries on global invalidation', () => {
    setCachedComponent('reports', {}, updatedAt)
    setCachedExtensionMeta('menu:reports', { extensionId: 'reports' })
    const generation = getExtensionCacheGeneration()
    invalidateExtensionCache({ reason: 'updated' })
    expect(getExtensionCacheGeneration()).toBeGreaterThan(generation)
    expect(getCacheStats().size).toBe(0)
    expect(extensionMetaCache.value.size).toBe(0)
  })
})
