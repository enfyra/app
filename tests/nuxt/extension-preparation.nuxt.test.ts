import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { useDynamicComponent } from '~/composables/dynamic/useDynamicComponent'
import { clearCache, getCachedComponent, invalidateExtensionCache } from '~/composables/dynamic/cache'

const mocks = vi.hoisted(() => ({ execute: vi.fn(), packages: vi.fn() }))
vi.mock('~/composables/dynamic/runtime', () => ({
  setupVueGlobals: async () => {}, getVueRuntime: async () => ({}),
  getComposablesObject: () => ({}), exposeComposables: () => {}, exposeVueGlobals: () => {},
  exposeExtensionGlobalsToVueApp: () => {}, setupPackagesGlobal: () => {},
  executeScriptInWindow: mocks.execute, findComponentInWindow: () => {},
}))
vi.mock('~/composables/dynamic/packages', () => ({
  getPackages: mocks.packages, detectPackages: () => ['test-package'],
}))
const date = '2026-10-23T00:00:00.000Z'
const flush = async () => { for (let i = 0; i < 20; i++) await Promise.resolve() }

describe('extension component preparation', () => {
  beforeEach(() => {
    clearCache()
    mocks.execute.mockReset().mockResolvedValue({ setup: vi.fn() })
    mocks.packages.mockReset().mockResolvedValue({})
  })
  afterEach(() => clearCache())

  it('prepares and retains all background components beyond the old retention limits', async () => {
    const setup = vi.fn()
    mocks.execute.mockResolvedValue({ setup })
    const loader = useDynamicComponent()
    for (let i = 0; i < 75; i++) {
      await loader.loadDynamicComponent('compiled', `background-page-${i}`, date, false, undefined, { speculative: () => true })
    }
    expect(mocks.execute).toHaveBeenCalledTimes(75)
    for (let i = 0; i < 75; i++) expect(getCachedComponent(`background-page-${i}`, date)).toBeTruthy()
    expect(setup).not.toHaveBeenCalled()
  })

  it('prepares packages and caches a definition without invoking Vue setup', async () => {
    const setup = vi.fn()
    mocks.execute.mockResolvedValue({ setup })
    const loader = useDynamicComponent()
    await loader.loadDynamicComponent('compiled', 'ready-page', date)
    expect(mocks.packages).toHaveBeenCalledWith(['test-package'], expect.objectContaining({ checkpoint: expect.any(Function) }))
    expect(getCachedComponent('ready-page', date)).toBeTruthy()
    expect(setup).not.toHaveBeenCalled()
  })

  it('deduplicates speculative and foreground component preparation', async () => {
    let finish!: (value: object) => void
    mocks.execute.mockImplementation(() => new Promise(resolve => { finish = resolve }))
    const loader = useDynamicComponent()
    const background = loader.loadDynamicComponent('compiled', 'shared-page', date, false, undefined, { speculative: () => true })
    await flush()
    const foreground = loader.loadDynamicComponent('compiled', 'shared-page', date)
    finish({})
    const [a, b] = await Promise.all([background, foreground])
    expect(a).toBe(b)
    expect(mocks.execute).toHaveBeenCalledOnce()
  })

  it('promotes a paused component even when navigation uses another menu for the same extension', async () => {
    const loader = useDynamicComponent()
    let release!: () => void
    const background = loader.loadDynamicComponent('compiled', 'aliased-page', date, false, undefined, {
      speculative: () => true,
      checkpoint: () => new Promise<void>(resolve => { release = resolve }),
    })
    await flush()
    expect(mocks.execute).not.toHaveBeenCalled()
    const foreground = loader.loadDynamicComponent('compiled', 'aliased-page', date)
    const [a, b] = await Promise.all([background, foreground])
    expect(a).toBe(b)
    expect(mocks.execute).toHaveBeenCalledOnce()
    release()
  })

  it('never publishes a component that became stale during script evaluation', async () => {
    let finish!: (value: object) => void
    mocks.execute.mockImplementation(() => new Promise(resolve => { finish = resolve }))
    const loader = useDynamicComponent()
    const pending = loader.loadDynamicComponent('old-code', 'stale-page', date)
    const rejection = expect(pending).rejects.toThrow('Extension changed during preparation')
    await flush()
    invalidateExtensionCache({ reason: 'updated' })
    finish({})
    await rejection
    expect(getCachedComponent('stale-page', date)).toBeNull()
  })

  it('keeps the new component when an older evaluation finishes after invalidation', async () => {
    let finishOld!: (value: object) => void
    mocks.execute.mockImplementationOnce(() => new Promise(resolve => { finishOld = resolve }))
    const loader = useDynamicComponent()
    const old = loader.loadDynamicComponent('old-code', 'replaced-page', date)
    const rejected = expect(old).rejects.toThrow('Extension changed during preparation')
    await flush()
    invalidateExtensionCache({ reason: 'updated' })
    const fresh = await loader.loadDynamicComponent('new-code', 'replaced-page', date)
    finishOld({ stale: true })
    await rejected
    expect(getCachedComponent('replaced-page', date)).toBe(fresh)
  })

  it('checks cancellation again after packages before executing page code', async () => {
    let finish!: () => void
    let cancelled = false
    mocks.packages.mockImplementation(() => new Promise<void>(resolve => { finish = resolve }))
    const loader = useDynamicComponent()
    const pending = loader.loadDynamicComponent('code', 'cancel-page', date, false, undefined, {
      checkpoint: async () => { if (cancelled) throw new DOMException('cancelled', 'AbortError') },
    })
    const rejection = expect(pending).rejects.toThrow('cancelled')
    await flush()
    cancelled = true
    finish()
    await rejection
    expect(mocks.execute).not.toHaveBeenCalled()
    expect(getCachedComponent('cancel-page', date)).toBeNull()
  })
})
