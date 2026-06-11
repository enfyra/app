import { describe, expect, it } from 'vitest'
import {
  findBestMenuRouteMatch,
  isDynamicMenuPath,
  matchMenuRoutePath,
  normalizeMenuRoutePath,
} from '~/utils/menu-route-patterns'

describe('menu route pattern helpers', () => {
  it('normalizes route paths for matching', () => {
    expect(normalizeMenuRoutePath('cloud/hosts/')).toBe('/cloud/hosts')
    expect(normalizeMenuRoutePath('/cloud/hosts?tab=projects')).toBe('/cloud/hosts')
  })

  it('matches dynamic route params by full path segments', () => {
    const match = matchMenuRoutePath('/cloud/hosts/:id', '/cloud/hosts/5')

    expect(match?.params).toEqual({ id: '5' })
    expect(match?.isExact).toBe(false)
  })

  it('does not match sibling prefixes', () => {
    expect(matchMenuRoutePath('/cloud/hosts/:id', '/cloud/hosts-old/5')).toBeNull()
  })

  it('matches nested dynamic route params', () => {
    const match = matchMenuRoutePath('/cloud/hosts/:hostId/projects/:projectId', '/cloud/hosts/5/projects/9')

    expect(match?.params).toEqual({ hostId: '5', projectId: '9' })
  })

  it('detects dynamic menu paths', () => {
    expect(isDynamicMenuPath('/cloud/hosts/:id')).toBe(true)
    expect(isDynamicMenuPath('/cloud/hosts')).toBe(false)
  })

  it('prefers exact menu routes over dynamic routes', () => {
    const items = [
      { id: 'dynamic', path: '/cloud/hosts/:id' },
      { id: 'exact', path: '/cloud/hosts/new' },
    ]

    const match = findBestMenuRouteMatch(items, '/cloud/hosts/new', (item) => item.path)

    expect(match?.item.id).toBe('exact')
  })
})
