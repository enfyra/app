import { afterEach, describe, expect, it, vi } from 'vitest'
import { getDefaultFilterValue } from '~/utils/common/filter/filter-helpers'
import { getCombinedOptionsForContext } from '~/utils/common/filter/filter-utils'

describe('filter defaults', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('defaults date filters to the current local day', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 7, 28, 9, 30))

    expect(getDefaultFilterValue('date', '_eq')).toBe('2026-08-28')
  })

  it('defaults date between filters to the current local day at both bounds', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 7, 28, 9, 30))

    expect(getDefaultFilterValue('date', '_between')).toEqual(['2026-08-28', '2026-08-28'])
  })

  it('does not create defaults for non-date filters', () => {
    expect(getDefaultFilterValue('string', '_eq')).toBeNull()
  })

  it('omits unresolved relation targets without inventing a selectable table', () => {
    const options = getCombinedOptionsForContext('records', {
      records: { definition: [
        { name: 'unresolved', fieldType: 'relation' },
        { name: 'owner', fieldType: 'relation', targetTable: { name: 'users' } },
      ] },
    })

    expect(options).toEqual([
      { label: 'unresolved → (unknown)', value: 'unresolved', fieldCategory: 'relation' },
      { label: 'owner → (users)', value: 'owner', fieldCategory: 'relation', targetTable: 'users' },
    ])
    expect(options[0]).not.toHaveProperty('targetTable')
  })
})
