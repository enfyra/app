import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const appDir = join(dirname(fileURLToPath(import.meta.url)), '../../app')

function readAppFile(path: string) {
  return readFileSync(join(appDir, path), 'utf8')
}

describe('button feedback', () => {
  it('makes the shared pressed state immediate', () => {
    const config = readAppFile('app.config.ts')

    expect(config).toContain('active:!transition-none')
    expect(config).not.toContain('active:translate-y-px')
  })

  it('starts header action loading from the click promise', () => {
    const actionSurfaces = [
      'components/layout/Header.vue',
      'components/layout/HeaderActions.vue',
      'components/layout/SubHeader.vue',
      'components/common/PageHeader.vue',
    ]

    for (const path of actionSurfaces) {
      const content = readAppFile(path)
      expect(content, `${path} enables automatic loading`).toContain(':loading-auto="true"')
    }

    const headerActions = readAppFile('components/layout/HeaderActions.vue')
    expect(headerActions).toContain('return action.submit()')
    expect(headerActions).toContain('return action.onClick()')

    for (const path of actionSurfaces.filter((path) => path !== 'components/layout/HeaderActions.vue')) {
      expect(readAppFile(path), `${path} returns the action result`).toContain('return action.onClick?.()')
    }
  })
})
