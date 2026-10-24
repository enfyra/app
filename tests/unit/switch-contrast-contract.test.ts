import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { twMerge } from 'tailwind-merge'
import { describe, expect, it } from 'vitest'
import { getPrimaryColorStyle, primaryColors } from '../../app/utils/primary-colors'

const appDir = join(dirname(fileURLToPath(import.meta.url)), '../../app')

function readAppFile(path: string) {
  return readFileSync(join(appDir, path), 'utf8')
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '').trim()
  return [
    Number.parseInt(clean.slice(0, 2), 16),
    Number.parseInt(clean.slice(2, 4), 16),
    Number.parseInt(clean.slice(4, 6), 16),
  ]
}

function mixRgb(c1: [number, number, number], weight1Percent: number, c2: [number, number, number]): [number, number, number] {
  const w = weight1Percent / 100
  return [
    Math.round(c1[0] * w + c2[0] * (1 - w)),
    Math.round(c1[1] * w + c2[1] * (1 - w)),
    Math.round(c1[2] * w + c2[2] * (1 - w)),
  ]
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const toLinear = (channel: number) => {
    const s = channel / 255
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
}

function contrastRatio(a: [number, number, number], b: [number, number, number]): number {
  const l1 = relativeLuminance(a)
  const l2 = relativeLuminance(b)
  const [bright, dark] = l1 >= l2 ? [l1, l2] : [l2, l1]
  return (bright + 0.05) / (dark + 0.05)
}

function parseRoleVars(cssBlock: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const match of cssBlock.matchAll(/(--[a-z0-9-]+):(#[0-9a-fA-F]{6})/g)) {
    out[match[1]!] = match[2]!
  }
  return out
}

describe('switch off-state contrast and transition contract', () => {
  it('preserves transition-colors on base and transition-transform on thumb after tailwind-merge', () => {
    const config = readAppFile('app.config.ts')
    const theme = readAppFile('assets/css/theme.css')
    const switchBlock = config.slice(config.indexOf('switch: {'), config.indexOf('checkbox: {'))

    expect(switchBlock).toContain('data-[state=unchecked]:bg-[var(--switch-unchecked-bg)]')
    expect(switchBlock).toContain('bg-[var(--switch-unchecked-thumb)]')
    expect(switchBlock).toContain('group-data-[state=unchecked]:text-[var(--switch-unchecked-icon)]')

    const baseStrings = [...switchBlock.slice(0, switchBlock.indexOf('thumb:')).matchAll(/"([^"]+)"/g)].map(m => m[1]!).join(' ')
    const thumbStrings = [...switchBlock.slice(switchBlock.indexOf('thumb:'), switchBlock.indexOf('icon:')).matchAll(/"([^"]+)"/g)].map(m => m[1]!).join(' ')

    const mergedBase = twMerge('transition-[background] duration-200 ease-out', baseStrings)
    const mergedThumb = twMerge('transition-transform duration-200 ease-out', thumbStrings)

    expect(mergedBase).toContain('transition-colors')
    expect(mergedThumb).toContain('transition-transform')

    expect(theme).toContain('--switch-unchecked-bg:')
    expect(theme).toContain('--switch-unchecked-thumb:')
    expect(theme).toContain('--switch-unchecked-icon:')
  })

  it('keeps unchecked switch track and thumb clearly distinct across light and dark palettes', () => {
    const lightCard = hexToRgb('#ffffff')
    const lightHigh = hexToRgb('#ececee')
    const darkCard = hexToRgb('#26262c')
    const darkHeader = hexToRgb('#303037')
    const darkHigh = hexToRgb('#414149')

    for (const { value } of primaryColors) {
      const style = getPrimaryColorStyle(value)
      const [lightBlock, darkBlock] = style.split('.dark{')
      const lightVars = parseRoleVars(lightBlock!)
      const darkVars = parseRoleVars(darkBlock!)

      const lightOutline = hexToRgb(lightVars['--md-outline']!)
      const lightTrack = mixRgb(lightOutline, 45, lightHigh)
      const lightThumb = lightCard

      expect(contrastRatio(lightTrack, lightCard), `${value} light track vs card`).toBeGreaterThanOrEqual(1.9)
      expect(contrastRatio(lightThumb, lightTrack), `${value} light thumb vs track`).toBeGreaterThanOrEqual(1.9)

      const darkOutline = hexToRgb(darkVars['--md-outline']!)
      const darkOnSurface = hexToRgb(darkVars['--md-on-surface']!)
      const darkTrack = mixRgb(darkOutline, 42, darkHigh)
      const darkThumb = darkOnSurface

      expect(contrastRatio(darkTrack, darkCard), `${value} dark track vs card`).toBeGreaterThanOrEqual(2.3)
      expect(contrastRatio(darkTrack, darkHeader), `${value} dark track vs header`).toBeGreaterThanOrEqual(2.0)
      expect(contrastRatio(darkThumb, darkTrack), `${value} dark thumb vs track`).toBeGreaterThanOrEqual(4.4)
    }
  })
})
