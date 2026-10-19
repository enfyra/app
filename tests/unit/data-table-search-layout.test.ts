import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { parse, type Node } from 'postcss'
import { compile } from 'tailwindcss'
import { describe, expect, it } from 'vitest'

const source = readFileSync(fileURLToPath(new URL('../../app/components/data-table/DataTable.vue', import.meta.url)), 'utf8')
const toolbarClasses = source.match(/<div v-if="props.headerName[^\n]+class="([^"]+)"/)![1]!.split(' ')
const titleTierClasses = source.match(/<div v-if="props.headerName[^\n]+class="([^"]+)">\s*<span v-if="props\.headerName"/)![1]!.split(' ')
const actionTierClasses = source.match(/<div v-if="props.showRecordCount[^\n]+class="([^"]+)">\s*<UBadge v-if="props\.showRecordCount"/)![1]!.split(' ')
const actionClusterClasses = source.match(/<div v-if="slots\['toolbar-actions'\][^\n]+class="([^"]+)"/)![1]!.split(' ')
const dividerClasses = source.match(/<div v-if="\(props\.headerName \|\| props\.searchable \|\| slots\.toolbar\)[^\n]+class="([^"]+)"/)![1]!.split(' ')
const theme = '@theme { --breakpoint-md: 48rem; --spacing: 0.25rem; } @tailwind utilities;'

function appliesAtWidth(node: Node, width: number) {
  for (let parent = node.parent; parent; parent = parent.parent) {
    if (parent.type !== 'atrule' || parent.name !== 'media') continue
    if (parent.params === '(width < 48rem)' && width >= 768) return false
    if (parent.params === '(width >= 48rem)' && width < 768) return false
  }
  return true
}

async function declarations(classes: string[], width: number, search: boolean) {
  const compiler = await compile(theme)
  const css = parse(compiler.build(classes))
  const active = new Map<string, string>()
  css.walkDecls(declaration => {
    let searchSelector = false
    for (let parent = declaration.parent; parent; parent = parent.parent) {
      if (parent.type === 'rule' && parent.selector.includes('.eapp-search-field')) searchSelector = true
    }
    if (searchSelector !== search || !appliesAtWidth(declaration, width)) return
    active.set(declaration.prop, declaration.value)
  })
  return active
}

describe('DataTable mobile search layout', () => {
  it.each([390, 767, 768, 1280])('keeps the table-owned Search full-width on the first tier below md at %ipx', async width => {
    const search = await declarations(toolbarClasses, width, true)
    expect(search.get('flex-basis')).toBe(width < 768 ? '100%' : undefined)
    expect(search.get('max-width')).toBe(width < 768 ? 'none' : undefined)
  })

  it.each([390, 767, 768, 1280])('stacks the two tiers and merges the action clusters below md at %ipx', async width => {
    const titleTier = await declarations(titleTierClasses, width, false)
    const actionTier = await declarations(actionTierClasses, width, false)
    const actions = await declarations(actionClusterClasses, width, false)
    expect(titleTier.get('width')).toBe(width < 768 ? '100%' : 'auto')
    expect(actionTier.get('width')).toBe(width < 768 ? '100%' : 'auto')
    expect(actionTier.get('display')).toBe(width < 768 ? 'flex' : 'contents')
    expect(actions.get('margin-left')).toBe('auto')
  })

  it.each([390, 767, 768, 1280])('renders the tier divider full-bleed below md at %ipx', async width => {
    const divider = await declarations(dividerClasses, width, false)
    expect(divider.get('width')).toBe('calc(100% + 1.5rem)')
    expect(divider.get('border-top-width')).toBe('1px')
    expect(divider.get('display')).toBe(width < 768 ? undefined : 'none')
    expect(divider.get('margin-inline')).toBe('calc(var(--spacing) * -3)')
  })

  it('keeps headerName visible independently of searchable', () => {
    expect(toolbarClasses.some(value => value.includes('.eapp-table-title') && value.includes('hidden')))
      .toBe(false)
    expect(source).toContain('v-if="props.headerName"')
    expect(source).toContain('v-if="props.searchable"')
  })
})
