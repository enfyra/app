import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const appDir = join(dirname(fileURLToPath(import.meta.url)), '../../app')

function readAppFile(path: string) {
  return readFileSync(join(appDir, path), 'utf8')
}

describe('filtered pagination totals', () => {
  it('uses the filtered count for user and package list queries', () => {
    const users = readAppFile('pages/settings/users/index.vue')
    const appPackages = readAppFile('pages/packages/app.vue')
    const backendPackages = readAppFile('pages/packages/backend.vue')

    expect(users).toContain('hasActiveFilters(currentFilter.value)')
    expect(users).toContain('apiData.value?.meta?.filterCount')
    expect(appPackages).toContain('apiData.value?.meta?.filterCount')
    expect(backendPackages).toContain('apiData.value?.meta?.filterCount')
  })
})
