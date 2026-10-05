import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse as parseVue } from '@vue/compiler-sfc'
import { parse, type Node } from 'postcss'
import { compile } from 'tailwindcss'
import { describe, expect, it } from 'vitest'

const appDir = fileURLToPath(new URL('../../app', import.meta.url))

function styleSources(directory: string): { file: string; content: string }[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = join(directory, entry.name)
    if (entry.isDirectory()) return styleSources(file)
    if (!/\.(css|vue)$/.test(file)) return []
    const content = readFileSync(file, 'utf8')
    return file.endsWith('.vue')
      ? parseVue(content).descriptor.styles.map(style => ({ file, content: style.content }))
      : [{ file, content }]
  })
}

function desktopHoverConditions(node: Node) {
  const conditions: string[] = []
  for (let parent = node.parent; parent; parent = parent.parent) {
    if (parent.type === 'atrule' && parent.name === 'media') conditions.push(parent.params)
  }
  const media = conditions.join(' and ')
  return /\(hover:\s*hover\)/.test(media)
    && /\(pointer:\s*fine\)/.test(media)
    && /\(min-width:\s*1024px\)/.test(media)
}

describe('desktop hover contract', () => {
  it('keeps every authored hover selector behind the desktop pointer capability boundary', () => {
    const unsafe: string[] = []
    for (const { file, content } of styleSources(appDir)) {
      parse(content).walkRules(rule => {
        if (/:hover\b/.test(rule.selector) && !desktopHoverConditions(rule)) {
          unsafe.push(`${file.slice(appDir.length + 1)}: ${rule.selector}`)
        }
      })
    }
    expect(unsafe).toEqual([])
  })

  it('applies the same boundary to Tailwind hover, group-hover and peer-hover utilities', async () => {
    const main = parse(readFileSync(join(appDir, 'assets/css/main.css'), 'utf8'))
    let variant = ''
    main.walkAtRules('custom-variant', rule => {
      if (rule.params === 'hover') variant = rule.toString()
    })
    expect(variant).not.toBe('')
    const compiler = await compile(`@theme { --color-primary: #00ff00; } @tailwind utilities; ${variant}`)
    const css = parse(compiler.build(['hover:bg-primary', 'group-hover:opacity-100', 'peer-hover:text-primary']))
    let hovered = 0
    css.walkRules(rule => {
      if (!/:hover\b/.test(rule.selector)) return
      hovered++
      expect(desktopHoverConditions(rule), rule.selector).toBe(true)
    })
    expect(hovered).toBe(3)
  })
})
