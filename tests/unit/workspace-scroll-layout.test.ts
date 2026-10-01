import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const appDir = join(dirname(fileURLToPath(import.meta.url)), '../../app')

function readAppFile(path: string) {
  return readFileSync(join(appDir, path), 'utf8')
}

describe('native Nuxt UI dashboard shell', () => {
  it('lets DashboardGroup and DashboardPanel own the fixed frame and body scrolling', () => {
    const layout = readAppFile('layouts/default.vue')

    expect(layout).toContain('<UDashboardGroup')
    expect(layout).toContain('<UDashboardPanel')
    expect(layout).toContain('<template #header>')
    expect(layout).toContain('<template #body>')
    expect(layout).toContain('<UDashboardNavbar')
    expect(layout).not.toMatch(/overflow-y-(?:auto|scroll)/)
    expect(layout).not.toContain('sticky')
    expect(layout).not.toContain('::before')
    expect(layout).not.toContain('eapp-shell-canvas')
    expect(layout).not.toContain('dvh')
  })

  it('restores route positions through the native panel body', () => {
    const layout = readAppFile('layouts/default.vue')
    const workspaceScroll = readAppFile('composables/layout/useWorkspaceScroll.ts')

    expect(layout).toContain('workspaceContent.value?.parentElement')
    expect(workspaceScroll).toContain('workspace.value?.scrollTop')
    expect(workspaceScroll).toContain('workspace.value?.scrollTo')
    expect(workspaceScroll).not.toContain('window.scrollY')
    expect(workspaceScroll).not.toContain('window.scrollTo')
  })

  it('aligns the desktop sidebar and stationary frame with one inset', () => {
    const layout = readAppFile('layouts/default.vue')
    const sidebar = readAppFile('components/sidebar/UnifiedSidebar.vue')
    const theme = readAppFile('assets/css/theme.css')

    expect(theme).toContain('--shell-inset: 1.5rem')
    expect(layout).toContain('lg:py-[var(--shell-inset)]')
    expect(layout).toContain('lg:pe-[var(--shell-inset)]')
    expect(layout).toContain('lg:rounded-[var(--radius-shell)]')
    expect(layout).toContain('lg:border-default')
    expect(theme).toContain('--shell-sidebar-inset: calc(var(--shell-inset) + 0.75rem)')
    expect(sidebar).toContain('variant="inset"')
    expect(sidebar).toContain("container: 'py-[var(--shell-sidebar-inset)]'")
    expect(sidebar).not.toContain('!border-r')
    expect(sidebar).not.toContain('sticky top-0')
  })

  it('keeps the page header outside the native scrolling body as a full-width header section', () => {
    const layout = readAppFile('layouts/default.vue')
    const pageHeader = readAppFile('components/common/PageHeader.vue')
    const headerPosition = layout.indexOf('<CommonPageHeader')
    const bodyPosition = layout.indexOf('<template #body>')

    expect(headerPosition).toBeGreaterThan(0)
    expect(headerPosition).toBeLessThan(bodyPosition)
    expect(pageHeader).toContain('<UPageHeader')
    expect(pageHeader).not.toContain('page-header-shell')
    expect(pageHeader).not.toContain('box-shadow')
    expect(pageHeader).not.toContain('<style')
  })

  it('observes pagination within the native body scroll boundary', () => {
    const visibility = readAppFile('composables/layout/useMiniBarVisibility.ts')

    expect(visibility.match(/root: el.closest/g)).toHaveLength(2)
    expect(visibility).toContain('.eapp-shell-main > [data-slot="body"]')
    expect(visibility).toContain('observer.disconnect()')
  })

  it('delegates mobile menu scroll locking to Nuxt UI', () => {
    const sidebar = readAppFile('components/sidebar/UnifiedSidebar.vue')

    expect(sidebar).toContain('<USidebar')
    expect(sidebar).not.toContain('useScrollLock')
    expect(sidebar).not.toContain('documentScrollLocked')
  })

  it('keeps the desktop rail collapsed and opens children with the native click popover', () => {
    const sidebar = readAppFile('components/sidebar/UnifiedSidebar.vue')

    expect(sidebar).toContain('collapsible="icon"')
    expect(sidebar).toContain('v-model:open="sidebarVisible"')
    expect(sidebar).toContain('<UNavigationMenu')
    expect(sidebar).toContain("mode: 'click'")
    expect(sidebar).not.toContain('@mouseenter="handleSidebarMouseEnter"')
    expect(sidebar).not.toContain('setSidebarVisibleTransient')
    expect(sidebar).toContain('if (width.value < 1024)')
  })
})
