import { afterEach, describe, expect, it, vi } from 'vitest'
import { ref, toRaw, toValue, unref } from 'vue'
import { useAppActivity } from '~/composables/shared/useAppActivity'
import { useApi } from '~/composables/shared/useApi'

const mocks = vi.hoisted(() => ({ fetch: vi.fn() }))
vi.mock('#build/fetch', () => ({ $fetch: mocks.fetch }))
vi.mock('~/composables/shared/useNotify', () => ({ useNotify: () => ({ error: vi.fn() }) }))
vi.mock('~/composables/shared/useCodeVersion', () => ({ useCodeVersion: () => ({ confirm: vi.fn() }) }))
vi.mock('~/composables/shared/useDatabase', () => ({ useDatabase: () => ({ getIdFieldName: () => 'id' }) }))

afterEach(() => vi.unstubAllGlobals())

describe('foreground app activity', () => {
  it('counts concurrent owners and releases each owner once', () => {
    const activity = useAppActivity()
    const first = activity.beginRequest()
    const second = activity.beginRequest()
    expect(activity.activeRequests.value).toBe(2)
    first()
    first()
    expect(activity.activeRequests.value).toBe(1)
    second()
    expect(activity.activeRequests.value).toBe(0)
  })

  it('tracks real useApi request lifetime including a denied request', async () => {
    vi.stubGlobal('ref', ref)
    vi.stubGlobal('toRaw', toRaw)
    vi.stubGlobal('toValue', toValue)
    vi.stubGlobal('unref', unref)
    vi.stubGlobal('$fetch', mocks.fetch)
    let reject!: (error: Error) => void
    mocks.fetch.mockImplementation(() => new Promise((_resolve, fail) => { reject = fail }))
    const api = useApi('/reports', { onError: () => true })
    const pending = api.execute()
    expect(useAppActivity().activeRequests.value).toBe(1)
    for (let i = 0; i < 12; i++) await Promise.resolve()
    reject(new Error('denied'))
    expect(await pending).toBeNull()
    expect(useAppActivity().activeRequests.value).toBe(0)
  })
})
