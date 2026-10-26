import { describe, expect, it } from 'vitest'
import { getRedundantIndexes, isAutomaticIndex, schemaConstraintsMatch } from '~/utils/schema/constraints'

const table = {
  uniques: [['user', 'discount']], indexes: [],
  relations: [{ propertyName: 'user', type: 'many-to-one' }, { propertyName: 'discount', type: 'many-to-one' }],
}

describe('collection constraints', () => {
  it('rejects only ordered unique prefixes', () => {
    expect(getRedundantIndexes({ ...table, indexes: [['user'], ['discount'], ['discount', 'user'], ['user', 'createdAt']] })).toEqual([['user']])
  })
  it('distinguishes automatic owning indexes from inverse and compound indexes', () => {
    expect(isAutomaticIndex(table, ['discount'])).toBe(true)
    expect(isAutomaticIndex(table, ['discount', 'user'])).toBe(false)
    expect(isAutomaticIndex({ relations: [{ propertyName: 'users', type: 'one-to-many', mappedBy: 'discount' }] }, ['users'])).toBe(false)
  })
  it('rejects a redundant index that reappears after saving while allowing required automatic indexes', () => {
    expect(schemaConstraintsMatch(table, { ...table, indexes: [['user']] })).toBe(false)
    expect(schemaConstraintsMatch(table, { ...table, indexes: [['discount'], ['createdAt'], ['updatedAt']] })).toBe(true)
  })
  it('does not accept loss of a requested index or unique', () => {
    expect(schemaConstraintsMatch({ ...table, indexes: [['discount', 'user']] }, table)).toBe(false)
    expect(schemaConstraintsMatch(table, { ...table, uniques: [] })).toBe(false)
  })
})
