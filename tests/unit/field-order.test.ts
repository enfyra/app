import { applyFieldPositions, sortDefinitionFieldsByKey } from '~/utils/form/field-order'

const makeField = (name: string, extra: Record<string, unknown> = {}) => ({
  name,
  fieldType: 'string',
  ...extra,
})

describe('field order helpers', () => {
  it('sorts numeric string keys numerically and nullish values last', () => {
    const fields = [
      makeField('ten', { sort: '10' }),
      makeField('none', { sort: null }),
      makeField('two', { sort: '2' }),
      makeField('alpha', { sort: 'abc' }),
    ]

    expect(sortDefinitionFieldsByKey(fields as any, 'sort').map((field) => field.name)).toEqual([
      'two',
      'ten',
      'alpha',
      'none',
    ])
  })

  it('pins fields into requested slots while preserving floating order', () => {
    const fields = [makeField('a'), makeField('b'), makeField('c'), makeField('d')]

    expect(
      applyFieldPositions(fields as any, {
        c: 0,
        a: 2,
        missing: 1,
      }).map((field) => field.name),
    ).toEqual(['c', 'b', 'a', 'd'])
  })

  it('clamps invalid positions and resolves collisions deterministically', () => {
    const fields = [makeField('first'), makeField('second'), makeField('third')]

    expect(
      applyFieldPositions(fields as any, {
        third: -5,
        first: 0,
        second: 99,
      }).map((field) => field.name),
    ).toEqual(['first', 'third', 'second'])
  })
})
