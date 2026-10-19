import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { parse, type Node } from 'postcss'
import { compile } from 'tailwindcss'
import { describe, expect, it } from 'vitest'

const source = readFileSync(fileURLToPath(new URL('../../app/components/data-table/DataTable.vue', import.meta.url)), 'utf8')
const toolbarClasses = source.match(/<div v-if="props.headerName[^\n]+class="([^"]+)"/)![1]!.split(' ')
const leftClasses = source.match(/<div class="([^"]+)">\s*<span v-if="props.headerName"/)![1]!.split(' ')
const actionsClasses = source.match(/<div v-if="slots\['toolbar-actions'\][^\n]+class="([^"]+)"/)![1]!.split(' ')
const dividerClasses = source.match(/<div v-if="\(props\.headerName \|\| slots\.toolbar\)[^\n]+class="([^"]+)"/)![1]!.split(' ')
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
  it.each([390, 767, 768, 1280])('keeps Search full-width and alone on the first tier below md at %ipx', async width => {
    const search = await declarations(toolbarClasses, width, true)
    const divider = await declarations(dividerClasses, width, false)
    expect(search.get('flex-basis')).toBe(width < 768 ? '100%' : undefined)
    expect(search.get('order')).toBe(width < 768 ? '-9999' : undefined)
    expect(divider.get('flex-basis')).toBe('calc(100% + 1.5rem)')
    expect(divider.get('border-top-width')).toBe('1px')
    expect(divider.get('display')).toBe(width < 768 ? undefined : 'none')
    expect(divider.get('margin-inline')).toBe('calc(var(--spacing) * -3)')
  })

  it.each([390, 767, 768, 1280])('merges both clusters into the second tier below md at %ipx', async width => {
    const left = await declarations(leftClasses, width, false)
    const actions = await declarations(actionsClasses, width, false)
    expect(left.get('display')).toBe(width < 768 ? 'contents' : 'flex')
    expect(actions.get('margin-left')).toBe('auto')
  })

  it('keeps the title on its own mobile tier and hides it when the toolbar has a search field', () => {
    const titleClasses = source.match(/<span v-if="props\.headerName" class="([^"]+)"/)![1]!.split(' ')
    expect(titleClasses).toContain('max-md:basis-full')
    expect(titleClasses).toContain('max-md:order-[-9999]')
    expect(toolbarClasses.some(value => value.includes(':has(.eapp-search-field)') && value.includes('.eapp-table-title')))
      .toBe(true)
  })
})
