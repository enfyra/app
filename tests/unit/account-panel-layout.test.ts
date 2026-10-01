import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const appDir = join(dirname(fileURLToPath(import.meta.url)), '../../app')

describe('account panel layout', () => {
  it('keeps expanded account content reachable in short viewports', () => {
    const sidebar = readFileSync(join(appDir, 'components/sidebar/UnifiedSidebar.vue'), 'utf8')
    const userInfo = readFileSync(join(appDir, 'components/sidebar/UserInfo.vue'), 'utf8')

    expect(sidebar).toMatch(/footer:\s*'[^']*min-h-0[^']*overflow-y-auto[^']*'/)
    expect(userInfo).toContain('<div class="w-full shrink-0">')
  })
})
