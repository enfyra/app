import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const repoDir = join(dirname(fileURLToPath(import.meta.url)), '../..')

function readRepoFile(path: string) {
  return readFileSync(join(repoDir, path), 'utf8')
}

describe('theme preflight', () => {
  it('injects the accent tokens into the shell head before any client script runs', () => {
    const config = readRepoFile('nuxt.config.ts')

    // The app is `ssr: false`, so a script registered from `app.vue` only runs
    // after hydration. The `--md-*` tokens have no static definition in CSS, so
    // without a shell-head script the first paint resolves `--bg-app` to nothing
    // and the canvas falls back to the default `--ui-bg` before snapping to the
    // themed color.
    expect(config).toContain("import { getPrimaryColorPreflightScript } from './app/utils/primary-colors'")
    expect(config).toContain('innerHTML: getPrimaryColorPreflightScript()')
    expect(config).toMatch(/app:\s*\{[\s\S]*head:\s*\{[\s\S]*script:[\s\S]*getPrimaryColorPreflightScript\(\)/)
  })

  it('does not duplicate the preflight script from the app root', () => {
    const appVue = readRepoFile('app/app.vue')

    expect(appVue).not.toContain('getPrimaryColorPreflightScript')
    expect(appVue).not.toContain('useHead')
  })

  it('keeps the preflight script self-contained and defensive', () => {
    const colors = readRepoFile('app/utils/primary-colors.ts')
    const script = colors.match(/return `try\{[\s\S]*?\}`;/)?.[0]
    expect(script, 'preflight script body should exist').toBeDefined()

    // The script runs before any app code, so it must not depend on it.
    expect(script).toContain("localStorage.getItem('")
    expect(script).not.toMatch(/\$fetch|await |import /)
  })
})
