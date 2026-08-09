import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const appDir = join(dirname(fileURLToPath(import.meta.url)), '../../app')

function readAppFile(path: string) {
  return readFileSync(join(appDir, path), 'utf8')
}

describe('document-scrolling app shell', () => {
  it('uses the document as the primary vertical scroll container', () => {
    const layout = readAppFile('layouts/default.vue')
    const sidebar = readAppFile('components/sidebar/UnifiedSidebar.vue')
    const mainStyles = readAppFile('assets/css/main.css')

    expect(layout).toContain('min-h-dvh')
    expect(layout).not.toContain('height: 100dvh')
    expect(layout).not.toContain('overflow-y-scroll')
    expect(layout).toContain('header class="sticky top-0')
    expect(sidebar).toContain('sticky top-0 h-dvh self-start')
    expect(mainStyles).toContain('overflow-x: clip !important')
  })

  it('restores route positions through the document scroll offset', () => {
    const workspaceScroll = readAppFile('composables/layout/useWorkspaceScroll.ts')

    expect(workspaceScroll).toContain('window.scrollY')
    expect(workspaceScroll).toContain('window.scrollTo')
    expect(workspaceScroll).not.toContain('workspaceEl.scrollTop')
  })

  it('locks document scrolling while the mobile sidebar is open', () => {
    const sidebar = readAppFile('components/sidebar/UnifiedSidebar.vue')

    expect(sidebar).toContain("import { useScrollLock } from '@vueuse/core';")
    expect(sidebar).toMatch(/useScrollLock\([^)]*document\.documentElement/)
    expect(sidebar).not.toMatch(/useScrollLock\([^)]*document\.body/)
    expect(sidebar).toContain('documentScrollLocked.value = mobile && visible')
  })
})
