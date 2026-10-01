import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const appDir = join(dirname(fileURLToPath(import.meta.url)), '../../app')

describe('DataTable column visibility menu', () => {
  it('does not lock page scroll or add body scrollbar compensation', () => {
    const source = readFileSync(join(appDir, 'components/data-table/DataTable.vue'), 'utf8')
    const menu = source.match(/<UPopover\b[^>]*visibilityItems.length[^>]*>/)?.[0]

    expect(menu).toBeDefined()
    const app = readFileSync(join(appDir, 'app.vue'), 'utf8')
    expect(app).toContain('<UTheme :props="{ dropdownMenu: { modal: false } }">')
    expect(menu).not.toContain(':modal=')
  })
})
