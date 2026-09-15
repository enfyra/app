import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const srcDir = join(dirname(fileURLToPath(import.meta.url)), '../../app')

function readAppFile(path: string) {
  return readFileSync(join(srcDir, path), 'utf8')
}

function collectFiles(dir: string, ext: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(join(srcDir, dir))) {
    const rel = dir ? join(dir, entry) : entry
    if (statSync(join(srcDir, rel)).isDirectory()) out.push(...collectFiles(rel, ext))
    else if (entry.endsWith(ext)) out.push(rel)
  }
  return out
}

type CssRule = { selectors: string[]; body: string }

function parseCssRules(css: string): CssRule[] {
  const rules: CssRule[] = []
  const stack: string[] = []
  let buf = ''

  for (const char of css) {
    if (char === '{') {
      stack.push(buf)
      buf = ''
      continue
    }
    if (char === '}') {
      const selector = stack.pop() ?? ''
      // Only leaf blocks carry declarations; at-rule wrappers hold nested blocks.
      if (!buf.includes('{') && selector.trim() && buf.trim()) {
        const selectors = selector
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
        if (selectors.length) rules.push({ selectors, body: buf })
      }
      buf = ''
      continue
    }
    buf += char
  }

  return rules
}

// These surfaces set an opaque `--card-bg`, so any backdrop-filter on them is
// fully hidden by the element's own background and only costs a filter pass.
const OPAQUE_BLUR_SURFACES = [
  '.surface-card',
  '.eapp-surface-card',
  '.eapp-modal-surface',
  '.eapp-identity-surface',
  '.eapp-primary-surface',
]

describe('compositing cost guard', () => {
  it('keeps backdrop-filter off surfaces whose own background is opaque', () => {
    const rules = parseCssRules(readAppFile('assets/css/main.css'))

    for (const surface of OPAQUE_BLUR_SURFACES) {
      const owned = rules.filter((rule) => rule.selectors.includes(surface))
      expect(owned.length, `${surface} should have a rule in main.css`).toBeGreaterThan(0)
      for (const rule of owned) {
        expect(rule.body, `${surface} must not declare a blur`).not.toContain('backdrop-filter')
      }
    }

    // The claim above only holds while the card background stays opaque.
    const theme = readAppFile('assets/css/theme.css')
    expect(theme).toContain('--card-bg: var(--block-base)')
    expect(theme).toContain('--block-base: #ffffff')
    expect(theme).toContain('--block-base: #242429')
  })

  it('keeps the layout header blur desktop-only over an opaque mobile background', () => {
    const layout = readAppFile('layouts/default.vue')
    const header = layout.match(/<header[\s\S]*?>/)
    expect(header, 'layout header should exist').not.toBeNull()

    expect(header![0]).toContain('sticky top-0')
    expect(header![0]).toContain('max-lg:bg-[var(--shell-main-bg)]')
    expect(header![0]).toContain('lg:backdrop-blur-xl')
    expect(header![0]).not.toMatch(/(?<!lg:)backdrop-blur/)
  })

  it('never animates opacity on an element that carries a blur', () => {
    const offenders: string[] = []

    for (const file of collectFiles('', '.vue')) {
      for (const line of readAppFile(file).split('\n')) {
        const classAttr = line.match(/class="([^"]*)"/)?.[1]
        if (!classAttr) continue
        const blurred = /backdrop-blur|surface-card/.test(classAttr)
        const animated = /animate-pulse|skeleton-pulse-slow/.test(classAttr)
        if (blurred && animated) offenders.push(`${file}: ${classAttr}`)
      }
    }

    expect(offenders).toEqual([])
  })

  it('keeps backdrop-blur only on elements with a see-through background', () => {
    const offenders: string[] = []

    for (const file of collectFiles('', '.vue')) {
      for (const line of readAppFile(file).split('\n')) {
        for (const classAttr of line.matchAll(/class="([^"]*)"/g)) {
          const value = classAttr[1]!
          if (!/(?<![\w:-])backdrop-blur/.test(value)) continue
          // A pure backdrop-filter utility class on the element only pays off
          // when the element's own background lets the backdrop show through:
          // an alpha modifier, a color-mix toward transparent, or no bg at all.
          const seeThrough =
            /(?:bg|surface)[^"'\s]*\/\d+/.test(value) ||
            /color-mix\(.*transparent/.test(value) ||
            /\bbg-transparent\b/.test(value)
          if (!seeThrough) offenders.push(`${file}: ${value}`)
        }
      }
    }

    expect(offenders).toEqual([])
  })
})
