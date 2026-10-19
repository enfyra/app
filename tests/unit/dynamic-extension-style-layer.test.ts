import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { parse } from 'postcss'
import { describe, expect, it } from 'vitest'

const runtime = readFileSync(fileURLToPath(new URL('../../app/composables/dynamic/useDynamicComponent.ts', import.meta.url)), 'utf8')
const mainCss = readFileSync(fileURLToPath(new URL('../../app/assets/css/main.css', import.meta.url)), 'utf8')

describe('dynamic extension style cascade', () => {
  it('declares extension styles below app utilities before loading Tailwind', () => {
    const stylesheet = parse(mainCss)
    const order = stylesheet.nodes.find(node => node.type === 'atrule' && node.name === 'layer')
    expect(order?.type === 'atrule' ? order.params.split(',').map(value => value.trim()) : [])
      .toEqual(['theme', 'base', 'components', 'enfyra-extensions', 'utilities'])
    expect(stylesheet.nodes.indexOf(order!)).toBeLessThan(stylesheet.nodes.findIndex(node => node.type === 'atrule' && node.name === 'import'))
  })

  it('keeps generated and authored extension CSS inside its own lower-priority layer', () => {
    expect(runtime).toContain('`@layer enfyra-extensions {\\n@scope')
    expect(runtime).toContain('${extensionCss}\\n}\\n}`')
  })
})
