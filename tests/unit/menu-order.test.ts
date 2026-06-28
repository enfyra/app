import { describe, expect, it } from 'vitest'
import { sortMenuItems } from '~/utils/menu-order'

describe('sortMenuItems', () => {
  it('orders menu items deterministically by order label path and id', () => {
    const items = [
      { id: 'data-zeta', label: 'Zeta', route: '/data/zeta' },
      { id: 'data-alpha-b', label: 'Alpha', route: '/data/beta' },
      { id: 'data-alpha-a', label: 'Alpha', route: '/data/alpha' },
      { id: 'data-low-order', label: 'Later', route: '/data/later', order: -1 },
    ]

    expect(sortMenuItems(items).map((item) => item.id)).toEqual([
      'data-low-order',
      'data-alpha-a',
      'data-alpha-b',
      'data-zeta',
    ])
  })
})
