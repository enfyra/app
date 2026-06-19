import { getDetailPathForTable, resolveRelationDetailPath } from '~/utils/relation-detail-paths'

describe('relation detail paths', () => {
  it('resolves mapped table detail paths', () => {
    expect(getDetailPathForTable('enfyra_user', 7)).toBe('/settings/users/7')
    expect(getDetailPathForTable('unknown_table', 7)).toBeNull()
  })

  it('resolves custom and id-based relation detail paths', () => {
    expect(resolveRelationDetailPath('enfyra_table', { name: 'posts' })).toBe('/collections/posts')
    expect(resolveRelationDetailPath('enfyra_extension', { id: 11 })).toBe('/settings/extensions/11')
    expect(resolveRelationDetailPath('enfyra_extension', { _id: 'abc' })).toBe('/settings/extensions/abc')
    expect(resolveRelationDetailPath('enfyra_extension', {})).toBeNull()
  })
})
