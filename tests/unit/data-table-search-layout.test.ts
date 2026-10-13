import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { parse, type Node } from 'postcss'
import { compile } from 'tailwindcss'
import { describe, expect, it } from 'vitest'

const source = readFileSync(fileURLToPath(new URL('../../app/components/data-table/DataTable.vue', import.meta.url)), 'utf8')
const toolbarClasses = source.match(/<div v-if="props.headerName[^\n]+class="([^"]+)"/)![1]!.split(' ')
const leftClasses = source.match(/<div class="([^"]+)">\s*<span v-if="props.headerName"/)![1]!.split(' ')
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
  it.each([390, 767, 768, 1280])('keeps Search full-width before other toolbar controls only below md at %ipx', async width => {
    const left = await declarations(leftClasses, width, false)
    const search = await declarations(toolbarClasses, width, true)
    expect(left.get('display')).toBe(width < 768 ? 'contents' : 'flex')
    expect(search.get('flex-basis')).toBe(width < 768 ? '100%' : undefined)
    expect(search.get('order')).toBe(width < 768 ? '-9999' : undefined)
  })
})
