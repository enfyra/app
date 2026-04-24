import { getDetailPathForTable, resolveRelationDetailPath } from '~/utils/relation-detail-paths'

describe('relation detail paths', () => {
  it('resolves mapped table detail paths', () => {
    expect(getDetailPathForTable('user_definition', 7)).toBe('/settings/users/7')
    expect(getDetailPathForTable('unknown_table', 7)).toBeNull()
  })

  it('resolves custom and id-based relation detail paths', () => {
    expect(resolveRelationDetailPath('table_definition', { name: 'posts' })).toBe('/collections/posts')
    expect(resolveRelationDetailPath('extension_definition', { id: 11 })).toBe('/settings/extensions/11')
    expect(resolveRelationDetailPath('extension_definition', { _id: 'abc' })).toBe('/settings/extensions/abc')
    expect(resolveRelationDetailPath('extension_definition', {})).toBeNull()
  })
})
