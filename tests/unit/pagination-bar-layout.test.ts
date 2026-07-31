import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const appDir = join(dirname(fileURLToPath(import.meta.url)), '../../app')

function readAppFile(path: string) {
  return readFileSync(join(appDir, path), 'utf8')
}

describe('sticky pagination layout', () => {
  it('keeps the sticky background flush without transparent top margins', () => {
    const pagination = readAppFile('components/common/PaginationBar.vue')
    const resourceList = readAppFile('components/common/ResourceListFrame.vue')
    const consumers = [
      readAppFile('pages/settings/guards/index.vue'),
      readAppFile('pages/settings/routes/index.vue'),
      readAppFile('pages/packages/app.vue'),
      readAppFile('pages/packages/backend.vue'),
    ]

    expect(pagination).toContain('eapp-pagination sticky bottom-0')
    expect(pagination).toContain('bg-[var(--bg-app)]')
    expect(resourceList).toContain('paginationClass: ""')

    for (const consumer of consumers) {
      expect(consumer).not.toMatch(/(?:class|pagination-class)="mt-\d+"/)
    }
  })
})
