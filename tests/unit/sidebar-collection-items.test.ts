import { describe, expect, it } from 'vitest'
import { selectSidebarCollections } from '../../app/utils/sidebar-collection-items'

const collections = ['alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta', 'eta']
  .map(name => ({ label: name, to: `/data/${name}` }))

describe('sidebar collection items', () => {
  it('keeps the menu order stable when the active collection changes', () => {
    expect(selectSidebarCollections(collections, 5).map(item => item.label))
      .toEqual(['alpha', 'beta', 'gamma', 'delta', 'epsilon'])
    expect(selectSidebarCollections(collections, 5).map(item => item.label))
      .toEqual(['alpha', 'beta', 'gamma', 'delta', 'epsilon'])
  })

  it('puts pinned collections first before applying the five-item limit', () => {
    expect(selectSidebarCollections(collections, 5, ['zeta', 'gamma']).map(item => item.label))
      .toEqual(['gamma', 'zeta', 'alpha', 'beta', 'delta'])
  })

  it('caps permission-filtered collections without inserting hidden records', () => {
    expect(selectSidebarCollections(collections.slice(0, 2), 5, ['zeta', 'beta']).map(item => item.label))
      .toEqual(['beta', 'alpha'])
  })
})
