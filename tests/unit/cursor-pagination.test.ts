import { afterEach, describe, expect, it, vi } from 'vitest'
import { effectScope, ref, type EffectScope } from 'vue'
import { useCursorPagination } from '~/composables/data-table/useCursorPagination'

const scopes: EffectScope[] = []
afterEach(() => scopes.splice(0).forEach(scope => scope.stop()))

describe('cursor page navigation', () => {
  it('replaces rows and reuses page cursors when navigating backward', async () => {
    const fetchPage = vi.fn(async (cursor: number | null) => {
      if (cursor === null) return [6, 5, 4]
      if (cursor === 5) return [4, 3, 2]
      return [2, 1]
    })
    const pagination = useCursorPagination({ itemsPerPage: 2, getCursor: (row: number) => row, fetchPage })
    await pagination.reset()
    expect(pagination.data.value).toEqual([6, 5])
    expect(pagination.hasNextPage.value).toBe(true)
    await pagination.setPage(2)
    expect(pagination.data.value).toEqual([4, 3])
    await pagination.setPage(3)
    expect(pagination.data.value).toEqual([2, 1])
    expect(pagination.hasNextPage.value).toBe(false)
    expect(await pagination.setPage(4)).toBe(false)
    await pagination.setPage(2)
    expect(pagination.page.value).toBe(2)
    expect(pagination.data.value).toEqual([4, 3])
    await pagination.setPage(1)
    expect(pagination.data.value).toEqual([6, 5])
    expect(fetchPage.mock.calls).toEqual([[null, 3], [5, 3], [3, 3], [5, 3], [null, 3]])
  })

  it('retains the current page after a failed request and releases loading', async () => {
    const fetchPage = vi.fn<(_: number | null, limit: number) => Promise<number[] | null>>()
      .mockResolvedValueOnce([6, 5, 4]).mockResolvedValueOnce(null).mockResolvedValueOnce([4, 3])
    const pagination = useCursorPagination({ itemsPerPage: 2, getCursor: (row: number) => row, fetchPage })
    await pagination.reset()
    expect(await pagination.setPage(2)).toBe(false)
    expect(pagination.page.value).toBe(1)
    expect(pagination.data.value).toEqual([6, 5])
    expect(pagination.hasNextPage.value).toBe(true)
    expect(pagination.loading.value).toBe(false)
    await pagination.setPage(2)
    expect(pagination.data.value).toEqual([4, 3])
  })

  it('keeps the last populated page if the next page becomes empty', async () => {
    const fetchPage = vi.fn<(_: number | null, limit: number) => Promise<number[] | null>>()
      .mockResolvedValueOnce([6, 5, 4]).mockResolvedValueOnce([])
    const pagination = useCursorPagination({ itemsPerPage: 2, getCursor: (row: number) => row, fetchPage })
    await pagination.reset()
    expect(await pagination.setPage(2)).toBe(false)
    expect(pagination.page.value).toBe(1)
    expect(pagination.data.value).toEqual([6, 5])
    expect(pagination.hasNextPage.value).toBe(false)
  })

  it('blocks duplicate navigation and ignores an older request after reset', async () => {
    let resolve!: (rows: number[]) => void
    const fetchPage = vi.fn<(_: number | null, limit: number) => Promise<number[] | null>>()
      .mockResolvedValueOnce([6, 5, 4])
      .mockImplementationOnce(() => new Promise(done => { resolve = done }))
      .mockResolvedValueOnce([9, 8, 7])
    const pagination = useCursorPagination({ itemsPerPage: 2, getCursor: (row: number) => row, fetchPage })
    await pagination.reset()
    const pending = pagination.setPage(2)
    expect(await pagination.setPage(2)).toBe(false)
    await pagination.reset()
    resolve([4, 3, 2])
    expect(await pending).toBe(false)
    expect(pagination.page.value).toBe(1)
    expect(pagination.data.value).toEqual([9, 8])
    expect(pagination.loading.value).toBe(false)
    expect(fetchPage).toHaveBeenCalledTimes(3)
  })

  it('clears cursor history on scope changes and rejects late rows from the old scope', async () => {
    const scope = effectScope()
    scopes.push(scope)
    const flow = ref('first')
    let resolve!: (rows: number[]) => void
    const fetchPage = vi.fn<(_: number | null, limit: number) => Promise<number[] | null>>()
      .mockResolvedValueOnce([6, 5, 4])
      .mockImplementationOnce(() => new Promise(done => { resolve = done }))
      .mockResolvedValueOnce([9, 8])
    const pagination = scope.run(() => useCursorPagination({ itemsPerPage: 2, getCursor: (row: number) => row, fetchPage, scope: flow }))!
    await pagination.reset()
    const pending = pagination.setPage(2)
    flow.value = 'second'
    expect(pagination.data.value).toEqual([])
    expect(await pagination.setPage(2)).toBe(false)
    await pagination.reset()
    resolve([4, 3, 2])
    expect(await pending).toBe(false)
    expect(pagination.data.value).toEqual([9, 8])
    expect(pagination.hasNextPage.value).toBe(false)
  })

  it('releases loading after a thrown request without losing the current page', async () => {
    const fetchPage = vi.fn<(_: number | null, limit: number) => Promise<number[] | null>>()
      .mockResolvedValueOnce([6, 5, 4]).mockRejectedValueOnce(new Error('Network failure'))
    const pagination = useCursorPagination({ itemsPerPage: 2, getCursor: (row: number) => row, fetchPage })
    await pagination.reset()
    await expect(pagination.setPage(2)).rejects.toThrow('Network failure')
    expect(pagination.page.value).toBe(1)
    expect(pagination.data.value).toEqual([6, 5])
    expect(pagination.loading.value).toBe(false)
  })
})
