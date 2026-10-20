import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { parse } from 'postcss'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(fileURLToPath(new URL(`../../app/${path}`, import.meta.url)), 'utf8')
const mainCss = read('assets/css/main.css')
const dataTable = read('components/data-table/DataTable.vue')
const settingsTable = read('components/data-table/SettingsTable.vue')
const settingsTableTypes = read('types/settings-table.ts')
const uiTypes = read('types/ui.ts')
const listPages = [
  'pages/collections/index.vue',
  'pages/packages/backend.vue',
  'pages/packages/app.vue',
  'pages/settings/helpers/index.vue',
  'pages/settings/roles/index.vue',
  'pages/settings/oauth/accounts/index.vue',
  'pages/storage/config/index.vue',
  'pages/settings/users/index.vue',
  'pages/settings/routes/index.vue',
  'pages/settings/websockets/index.vue',
  'pages/settings/methods/index.vue',
  'pages/settings/oauth/config/index.vue',
  'pages/settings/extensions/index.vue',
  'pages/settings/flows/index.vue',
  'pages/data/index.vue',
]

function selectors() {
  const stylesheet = parse(mainCss)
  const found: string[] = []
  stylesheet.walkRules(rule => { found.push(rule.selector) })
  return found
}

describe('panel table surface', () => {
  it('does not customise the table based on its panel ancestor', () => {
    expect(selectors().some(selector => selector.includes('.eapp-panel .eapp-data-table'))).toBe(false)
    expect(selectors().some(selector => selector.includes('.eapp-data-table'))).toBe(false)
  })

  it('always renders the same table frame', () => {
    expect(dataTable).toContain('class="eapp-data-table min-w-0 w-full overflow-hidden rounded-[var(--radius-card)] border border-default bg-default"')
    expect(dataTable).not.toContain('flush')
    expect(uiTypes).not.toContain('flush?: boolean')
    expect(settingsTableTypes).not.toContain('flush?: boolean')
    expect(settingsTable).not.toContain('flush')
  })

  it('renders list tables standalone instead of nesting them in a panel', () => {
    for (const page of listPages) {
      const source = read(page)
      expect(source, page).not.toContain('CommonPanel')
      expect(source, page).not.toContain('flush')
      expect(source, page).toMatch(/header-name="/)
    }
    expect(read('pages/settings/users/index.vue')).toMatch(/<DataTableSettingsTable\n\s+header-name="User Manager"/)
  })
})
