import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const appDir = join(dirname(fileURLToPath(import.meta.url)), '../../app')

function readAppFile(path: string) {
  return readFileSync(join(appDir, path), 'utf8')
}

describe('shared button radius', () => {
  it('keeps page header actions and panel header buttons on the control radius', () => {
    const button = readAppFile('app.config.ts')
    const buttonBlock = button.slice(button.indexOf('button: {'), button.indexOf('button: {') + 4500)
    expect(buttonBlock).toContain('!rounded-[var(--radius-control)]')
    expect(buttonBlock).not.toContain('"rounded-[var(--radius-control)]"')

    const headerAction = readAppFile('utils/common/header-action-button.ts')
    expect(headerAction).toContain('!rounded-[var(--radius-control)]')
    expect(headerAction).not.toContain('--radius-subcontrol')

    const css = readAppFile('assets/css/main.css')
    expect(css).not.toMatch(/\.rounded-md\s*\{[^}]*--radius-subcontrol/)
  })
})
