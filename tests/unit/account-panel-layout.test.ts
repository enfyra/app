import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const appDir = join(dirname(fileURLToPath(import.meta.url)), '../../app')

describe('account panel layout', () => {
  it('keeps accent controls compact on one sidebar row', () => {
    const component = readFileSync(join(appDir, 'components/sidebar/ThemeAccountPanelItem.vue'), 'utf8')

    expect(component).toContain('grid-cols-[repeat(auto-fit,minmax(1.5rem,1fr))]')
    expect(component).toContain('class="flex h-6 w-6 items-center justify-center')
    expect(component).not.toContain('min-h-[44px] min-w-[44px]')
    expect(component).not.toContain('flex flex-wrap items-center justify-center gap-1.5')
  })

  it('keeps expanded account content reachable in short viewports', () => {
    const sidebar = readFileSync(join(appDir, 'components/sidebar/UnifiedSidebar.vue'), 'utf8')
    const userInfo = readFileSync(join(appDir, 'components/sidebar/UserInfo.vue'), 'utf8')

    expect(sidebar).toMatch(/footer:\s*'[^']*min-h-0[^']*overflow-y-auto[^']*'/)
    expect(userInfo).toContain('<div class="w-full shrink-0">')
  })
})
