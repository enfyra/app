import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { parse, type Node } from 'postcss'
import { compile } from 'tailwindcss'
import { describe, expect, it } from 'vitest'

const source = readFileSync(fileURLToPath(new URL('../../app/components/data-table/Pagination.vue', import.meta.url)), 'utf8')
const separatorClasses = source.match(/v-if="isCursor \|\| hasPagination" class="([^"]+)"/)![1]!.split(' ')
const theme = '@theme { --breakpoint-md: 48rem; --spacing: 0.25rem; } @tailwind utilities;'

function mediaConditions(node: Node) {
  const conditions: string[] = []
  for (let parent = node.parent; parent; parent = parent.parent) {
    if (parent.type === 'atrule' && parent.name === 'media') conditions.push(parent.params)
  }
  return conditions
}

function appliesAtWidth(conditions: string[], width: number) {
  return conditions.every((condition) => {
    const match = condition.match(/^\(width < ([\d.]+)rem\)$/)
    if (!match) throw new Error(`Unexpected separator media condition: ${condition}`)
    return width < Number(match[1]) * 16
  })
}

describe('table pagination separator CSS', () => {
  it.each([390, 767, 768, 1280])('keeps extension border utilities off the controls wrapper at %ipx', async (width) => {
    const extensionCompiler = await compile(theme)
    const extensionCss = parse(extensionCompiler.build(['border-t', 'pt-4']))
    extensionCss.walkRules('.border-t', (rule) => {
      expect(mediaConditions(rule)).toEqual([])
    })
    expect(separatorClasses).not.toContain('border-t')

    const compiler = await compile(theme)
    const css = parse(compiler.build(separatorClasses))
    const active = new Map<string, string>()
    css.walkDecls((declaration) => {
      if (declaration.parent?.type !== 'rule') return
      if (!appliesAtWidth(mediaConditions(declaration), width)) return
      active.set(declaration.prop, declaration.value)
    })

    expect(active.get('border-top-width') ?? '0px').toBe(width < 768 ? '1px' : '0px')
    expect(active.has('padding-top')).toBe(width < 768)
    expect(active.has('padding-inline')).toBe(width < 768)
    expect(active.has('grid-column')).toBe(width < 768)
    expect(active.has('margin-inline')).toBe(width < 768)
  })

  it('emits separator declarations only inside the same breakpoint as its second row', async () => {
    const compiler = await compile(theme)
    const css = parse(compiler.build(separatorClasses))
    const properties = new Set(['border-top-width', 'padding-top', 'padding-inline', 'grid-column', 'margin-inline'])
    let declarations = 0
    css.walkDecls((declaration) => {
      if (!properties.has(declaration.prop)) return
      declarations++
      expect(mediaConditions(declaration)).toEqual(['(width < 48rem)'])
    })
    expect(declarations).toBe(properties.size)
  })
})
