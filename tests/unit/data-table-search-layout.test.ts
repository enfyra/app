import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { parse, type Node } from 'postcss'
import { compile } from 'tailwindcss'
import { describe, expect, it } from 'vitest'

const source = readFileSync(fileURLToPath(new URL('../../app/components/data-table/DataTable.vue', import.meta.url)), 'utf8')
const toolbarClasses = source.match(/<div class="(flex flex-col border-b border-default bg-muted)"/)![1]!.split(' ')
const headerRowClasses = source.match(/<div class="(flex flex-wrap items-center md:flex-nowrap)"/)![1]!.split(' ')
const titleTierClasses = source.match(/<div class="(flex min-h-11 min-w-0 flex-1 items-center px-3 py-2 md:min-h-14 md:px-4 md:py-3)"/)![1]!.split(' ')
const actionTierClasses = source.match(/<div class="(flex min-h-11 w-full min-w-0 items-center gap-2 border-t border-default px-3 py-2 md:min-h-14 md:w-auto md:border-t-0 md:px-4 md:py-3)"/)![1]!.split(' ')
const actionStateClasses = [...source.match(/<div class="flex min-h-11 w-full min-w-0 items-center gap-2 border-t border-default px-3 py-2 md:min-h-14 md:w-auto md:border-t-0 md:px-4 md:py-3" :class="([^"]+)"/)![1]!.matchAll(/'([^']+)'/g)].map(match => match[1]!.split(' '))
const searchRowClasses = source.match(/<div v-if="props.searchable" class="([^"]+)"/)![1]!.split(' ')
const desktopCountClasses = source.match(/aria-live="polite" class="([^"]+)"/)![1]!.split(' ')
const mobileCountClasses = source.match(/class="([^"]+)" aria-hidden="true"/)![1]!.split(' ')
const theme = '@theme { --breakpoint-md: 48rem; --spacing: 0.25rem; } @tailwind utilities;'

function appliesAtWidth(node: Node, width: number) {
  for (let parent = node.parent; parent; parent = parent.parent) {
    if (parent.type !== 'atrule' || parent.name !== 'media') continue
    if (parent.params === '(width < 48rem)' && width >= 768) return false
    if (parent.params === '(width >= 48rem)' && width < 768) return false
  }
  return true
}

async function declarations(classes: string[], width: number) {
  const compiler = await compile(theme)
  const css = parse(compiler.build(classes))
  const active = new Map<string, string>()
  css.walkDecls(declaration => {
    if (!appliesAtWidth(declaration, width)) return
    active.set(declaration.prop, declaration.value)
  })
  return active
}

describe('DataTable toolbar layout', () => {
  it('keeps the toolbar free of padding so every tier divider reaches both edges', async () => {
    for (const width of [390, 768, 1280]) {
      const toolbar = await declarations(toolbarClasses, width)
      expect(toolbar.get('padding')).toBeUndefined()
      expect(toolbar.get('padding-inline')).toBeUndefined()
      expect((await declarations(searchRowClasses, width)).get('border-top-width')).toBe('1px')
    }
  })

  it.each([390, 767, 768, 1280])('gives the header, action and search tiers the same minimum height at %ipx', async width => {
    for (const classes of [titleTierClasses, actionTierClasses, searchRowClasses]) {
      expect((await declarations(classes, width)).get('min-height')).toBe(width < 768 ? 'calc(var(--spacing) * 11)' : 'calc(var(--spacing) * 14)')
    }
  })

  it('stacks the action tier under the header below md', async () => {
    const actionTier = await declarations(actionTierClasses, 390)
    expect(actionTier.get('width')).toBe('100%')
    expect(actionTier.get('border-top-width')).toBe('1px')
    expect((await declarations(headerRowClasses, 390)).get('flex-wrap')).toBe('wrap')
  })

  it.each([768, 1280])('keeps the action cluster on the header row from md at %ipx', async width => {
    const actionTier = await declarations(actionTierClasses, width)
    expect(actionTier.get('width')).toBe('auto')
    expect(actionTier.get('border-top-width')).toBe('0px')
    expect((await declarations(headerRowClasses, width)).get('flex-wrap')).toBe('nowrap')
    expect((await declarations(titleTierClasses, width)).get('flex')).toBe('1')
  })

  it('shows the record count beside the title on desktop and in the action tier on mobile', async () => {
    expect((await declarations(desktopCountClasses, 1280)).get('display')).toBe('inline-flex')
    expect((await declarations(desktopCountClasses, 390)).get('display')).toBe('none')
    expect((await declarations(mobileCountClasses, 390)).get('display')).toBeUndefined()
    expect((await declarations(mobileCountClasses, 1280)).get('display')).toBe('none')
  })

  it('hides the action tier on desktop when there are no actions', () => {
    expect(actionStateClasses.flat()).toContain('md:hidden')
  })

  it('keeps search on its own full-width row below the header', () => {
    expect(source).toContain('<div v-if="props.searchable" class="flex min-h-11 min-w-0 items-center border-t border-default px-3 py-2 md:min-h-14 md:px-4 md:py-3">')
    expect(source).toContain('v-model="search"')
    expect(source).toContain('@search="value => emit(\'search\', value)"')
  })

  it('requires a header and never gates it behind another prop', () => {
    expect(source).toContain('{{ props.headerName }}')
    expect(source).not.toContain('v-if="props.headerName"')
    expect(source).toContain('v-if="props.headerDescription"')
  })
})
