import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { sortMenuItems } from '~/utils/menu-order'

const appDir = join(dirname(fileURLToPath(import.meta.url)), '../../app')

function readAppFile(path: string) {
  return readFileSync(join(appDir, path), 'utf8')
}

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

  it('keeps child draggable free of dynamic header slots so dragging #0 -> #1 -> #0 never maps to last index', () => {
    const editor = readAppFile('components/menu/MenuVisualEditor.vue')
    const item = readAppFile('components/menu/MenuVisualEditorItem.vue')
    const page = readAppFile('pages/settings/menus/index.vue')

    expect(item).not.toContain('<template #header>')
    expect(item).not.toContain('menu-child-drop-inline-hint')
    expect(editor).toContain('compareMenuOrder')
    expect(page).toContain(':loading="pageMenusLoading && menus.length === 0"')
  })
})

