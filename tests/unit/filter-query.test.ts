import { useFilterQuery } from '~/composables/form/useFilterQuery'

describe('useFilterQuery', () => {
  const filterQuery = useFilterQuery()

  it('builds nested conditions and preserves falsey but meaningful values', () => {
    expect(
      filterQuery.buildConditionObject({
        id: '1',
        field: 'author.role.name',
        operator: '_eq',
        value: 'admin',
      } as any),
    ).toEqual({
      author: {
        role: {
          name: { _eq: 'admin' },
        },
      },
    })

    expect(
      filterQuery.buildConditionObject({
        id: '2',
        field: 'isEnabled',
        operator: '_eq',
        value: false,
      } as any),
    ).toEqual({
      isEnabled: { _eq: false },
    })
  })

  it('handles null, between, and inclusion operators correctly', () => {
    expect(
      filterQuery.buildConditionObject({
        id: '1',
        field: 'deletedAt',
        operator: '_is_null',
        value: null,
      } as any),
    ).toEqual({
      deletedAt: { _is_null: true },
    })

    expect(
      filterQuery.buildConditionObject({
        id: '2',
        field: 'createdAt',
        operator: '_between',
        value: ['2024-01-01', '2024-12-31'],
      } as any),
    ).toEqual({
      createdAt: { _between: ['2024-01-01', '2024-12-31'] },
    })

    expect(
      filterQuery.buildConditionObject({
        id: '3',
        field: 'status',
        operator: '_in',
        value: 'active',
      } as any),
    ).toEqual({
      status: { _in: ['active'] },
    })
  })

  it('round-trips filter state through url encoding', () => {
    const filter = {
      id: 'group',
      operator: 'and',
      conditions: [
        { id: '1', field: 'status', operator: '_eq', value: 'active' },
        {
          id: 'nested',
          operator: 'or',
          conditions: [
            { id: '2', field: 'priority', operator: '_gte', value: 2 },
          ],
        },
      ],
    } as any

    const encoded = filterQuery.encodeFilterToUrl(filter)
    const params = new URLSearchParams()
    params.set('filter', encoded)

    expect(filterQuery.parseFilterFromUrl(params)).toEqual(filter)
  })

  it('detects active filters and creates readable summaries', () => {
    const filter = {
      id: 'group',
      operator: 'and',
      conditions: [
        { id: '1', field: 'status', operator: '_in', value: ['active', 'draft'] },
        { id: '2', field: 'archivedAt', operator: '_is_null', value: null },
      ],
    } as any

    expect(filterQuery.hasActiveFilters(filter)).toBe(true)
    expect(
      filterQuery.getFilterSummary(filter, [
        { key: 'status', label: 'Status' },
        { key: 'archivedAt', label: 'Archived At' },
      ]),
    ).toBe('(Status in [active, draft] AND Archived At is null)')
  })
})
