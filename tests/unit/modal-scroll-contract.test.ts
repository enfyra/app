import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const appDir = join(dirname(fileURLToPath(import.meta.url)), '../../app')

function readAppFile(path: string) {
  return readFileSync(join(appDir, path), 'utf8')
}

describe('modal scroll contract', () => {
  it('keeps header and footer fixed while the body owns the scroll', () => {
    const config = readAppFile('app.config.ts')
    const modalBlock = config.slice(config.indexOf('modal: {'), config.indexOf('switch: {'))

    expect(modalBlock).toContain('header: \'shrink-0')
    expect(modalBlock).toContain('footer: \'shrink-0')
    expect(modalBlock).toContain('body: \'eapp-modal-body min-h-0')
  })

  it('does not let a modal override collapse the native header minimum', () => {
    const modal = readAppFile('components/collection/SchemaViewerModal.vue')

    expect(modal).not.toContain("header: 'min-h-0")
    expect(modal).not.toContain('body: \'min-h-0\'')
  })
})
