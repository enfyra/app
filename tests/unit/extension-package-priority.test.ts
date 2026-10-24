import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const flush = async () => { for (let i = 0; i < 30; i++) await Promise.resolve() }

describe('extension package preparation priority', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubGlobal('window', { location: { search: '' } })
    vi.stubGlobal('fetch', vi.fn(async (url: string) => url.startsWith('/api/enfyra_package')
      ? { ok: true, json: async () => ({ data: [{ name: 'priority-package', version: '1.0.0' }] }) }
      : { ok: true, text: async () => 'export default {}' }))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(URL, 'createObjectURL').mockImplementation(() => { throw new Error('module-evaluation-boundary') })
    delete (globalThis as any).packages
  })
  afterEach(() => { delete (globalThis as any).packages; vi.restoreAllMocks(); vi.unstubAllGlobals() })

  it('does not evaluate a downloaded package until its background checkpoint permits it', async () => {
    const { getPackages } = await import('~/composables/dynamic/packages')
    let reject!: (error: Error) => void
    let checkpoints = 0
    const pending = getPackages(['priority-package'], {
      speculative: () => true,
      checkpoint: async () => {
        if (++checkpoints > 1) await new Promise<void>((_resolve, fail) => { reject = fail })
      },
    })
    const assertion = expect(pending).rejects.toThrow('Failed to load package')
    await flush()
    expect(URL.createObjectURL).not.toHaveBeenCalled()
    reject(new Error('cancelled'))
    await assertion
    expect(URL.createObjectURL).not.toHaveBeenCalled()
  })

  it('promotes a shared package without waiting for an unrelated background checkpoint', async () => {
    const { getPackages } = await import('~/composables/dynamic/packages')
    let resume!: () => void
    let checkpoints = 0
    const background = getPackages(['priority-package'], {
      speculative: () => true,
      checkpoint: async () => {
        if (++checkpoints > 1) await new Promise<void>(resolve => { resume = resolve })
      },
    })
    const backgroundAssertion = expect(background).rejects.toThrow('Failed to load package')
    await flush()
    expect(URL.createObjectURL).not.toHaveBeenCalled()
    const foreground = getPackages(['priority-package'])
    const foregroundAssertion = expect(foreground).rejects.toThrow('Failed to load package')
    await Promise.all([backgroundAssertion, foregroundAssertion])
    expect(URL.createObjectURL).toHaveBeenCalledOnce()
    expect(fetch).toHaveBeenCalledTimes(2)
    resume()
  })
})
