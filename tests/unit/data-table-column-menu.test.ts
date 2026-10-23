import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const appDir = join(dirname(fileURLToPath(import.meta.url)), '../../app')

describe('DataTable column visibility menu', () => {
  it('hides only the unavoidable native loading fallback row while skeleton rows own geometry', () => {
    const source = readFileSync(join(appDir, 'components/data-table/DataTable.vue'), 'utf8')
    expect(source).toContain("skeletonActive ? 'eapp-table-skeleton-body' : ''")
    expect(source).toMatch(/:deep\(\.eapp-table-skeleton-body > tr:has\(> \[data-slot='loading'\]\)\)\s*\{\s*display: none;/)
    expect(source).toContain('<span v-if="skeletonActive" aria-hidden="true" hidden />')
    expect(source).toContain('aria-hidden="true" inert')
    expect(source).toContain('nativeUi.value.td(')
    expect(source).toMatch(/\.eapp-table-skeleton-row:has\(\+ tr:last-child > \[data-slot='loading'\]\)\)\s*\{\s*border-bottom-width: 0;/)
  })

  it('does not lock page scroll or add body scrollbar compensation', () => {
    const source = readFileSync(join(appDir, 'components/data-table/DataTable.vue'), 'utf8')
    const menu = source.match(/<UDropdownMenu\b[^>]*visibilityItems.length[^>]*>/)?.[0]

    expect(menu).toBeDefined()
    const app = readFileSync(join(appDir, 'app.vue'), 'utf8')
    expect(app).toContain('<UTheme :props="{ dropdownMenu: { modal: false } }">')
    expect(menu).not.toContain(':modal=')
  })
})
