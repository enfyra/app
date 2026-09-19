import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const appDir = join(dirname(fileURLToPath(import.meta.url)), '../../app')

function readAppFile(path: string) {
  return readFileSync(join(appDir, path), 'utf8')
}

describe('resource list item trailing controls', () => {
  it('keeps the trailing controls in one centred cluster', () => {
    const item = readAppFile('components/common/ResourceListItem.vue')
    const css = readAppFile('assets/css/main.css')

    // The header actions (switch) and the row actions (buttons) differ in height,
    // so as sibling row items they aligned on their top edge once the row switches
    // to `align-items: flex-start` on mobile. One wrapping cluster keeps them
    // centred against each other at every width.
    const groups = item.match(/eapp-resource-list-actions-group/g) ?? []
    expect(groups.length, 'header and row actions share one wrapper').toBe(2)
    expect(item).toMatch(/eapp-resource-list-actions-group[\s\S]*eapp-resource-list-header-actions[\s\S]*eapp-resource-list-actions/)

    const groupRule = css.match(/\.eapp-resource-list-actions-group \{[^}]*\}/)?.[0]
    expect(groupRule, 'actions group rule should exist').toBeDefined()
    expect(groupRule).toContain('align-items: center')
    expect(groupRule).toContain('var(--eapp-resource-list-gap')
  })

  it('keeps the row gap token as the single source of spacing', () => {
    const css = readAppFile('assets/css/main.css')

    expect(css).toContain('--eapp-resource-list-gap: 0.875rem')
    expect(css).toContain('--eapp-resource-list-gap: 0.625rem')
    expect(css).toContain('--eapp-resource-list-gap: 1rem')

    // The mobile override block must set the token, not a bare `gap`, or the
    // cluster would keep the desktop spacing on phones. Anchored so the check
    // does not match the `-gap:` inside the custom property name itself.
    const mobileBlock = css.match(/@media \(max-width: 767px\) \{[\s\S]*?\n\}/)?.[0]
    expect(mobileBlock, 'mobile resource list block should exist').toBeDefined()
    expect(mobileBlock).toContain('--eapp-resource-list-gap: 0.75rem')
    expect(mobileBlock).not.toMatch(/[\s{;]gap:/)
  })
})
