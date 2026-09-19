import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const appDir = join(dirname(fileURLToPath(import.meta.url)), '../../app')

function readAppFile(path: string) {
  return readFileSync(join(appDir, path), 'utf8')
}

describe('pagination layout', () => {
  it('keeps the main bar in flow as a full-bleed workspace edge', () => {
    const pagination = readAppFile('components/common/PaginationBar.vue')
    const resourceList = readAppFile('components/common/ResourceListFrame.vue')
    const consumers = [
      readAppFile('pages/settings/guards/index.vue'),
      readAppFile('pages/settings/routes/index.vue'),
      readAppFile('pages/packages/app.vue'),
      readAppFile('pages/packages/backend.vue'),
    ]

    // The main bar is not sticky any more; a fixed mini bar replaces it instead.
    expect(pagination).not.toContain('sticky bottom-')
    expect(pagination).toContain("'eapp-pagination',")
    expect(pagination).toContain('bg-[var(--shell-main-bg)]')
    expect(pagination).toContain('-mx-4 px-4')
    expect(pagination).toContain('sm:-mx-6 sm:px-6')
    expect(pagination).toContain('v-bind="$attrs"')
    expect(pagination).toContain('inheritAttrs: false')

    expect(resourceList).toContain('paginationClass: ""')
    expect(resourceList).toContain('class="contents"')
    expect(resourceList).toContain(":class=\"[paginationClass, 'mt-4']\"")

    for (const consumer of consumers) {
      expect(consumer).not.toMatch(/(?:class|pagination-class)="mt-\d+"/)
    }
  })

  it('renders the same bar everywhere instead of per-caller variants', () => {
    const css = readAppFile('assets/css/main.css')
    const resourceList = readAppFile('components/common/ResourceListFrame.vue')
    const barSites = [
      'components/common/ResourceListFrame.vue',
      'pages/settings/guards/index.vue',
      'pages/settings/routes/index.vue',
      'pages/storage/management/index.vue',
      'pages/storage/management/folder/[id].vue',
      'pages/collections/index.vue',
      'pages/data/[table]/index.vue',
    ]
    const frameSites = [
      'pages/packages/app.vue',
      'pages/packages/backend.vue',
    ]

    // The frame used to paint its pagination as a nested card while every direct
    // caller rendered a full-bleed workspace edge, so the same control read as two
    // different components depending on the page.
    expect(css).not.toContain('eapp-pagination-separated')
    expect(resourceList).not.toContain('eapp-pagination-separated')

    // No site may re-tint, re-align, or drop the range, or the divergence returns.
    for (const site of barSites) {
      const source = readAppFile(site)
      const blocks = source.match(/<CommonPaginationBar[\s\S]*?\/>/g) ?? []
      expect(blocks.length, `${site} should render a pagination bar`).toBeGreaterThan(0)
      for (const block of blocks) {
        for (const prop of ['align=', 'color=', 'active-color=', 'show-range=']) {
          expect(block, `${site} should not override ${prop}`).not.toContain(prop)
        }
      }
    }

    // Pages that hand the pagination to the frame must not pass the same knobs.
    for (const site of frameSites) {
      const source = readAppFile(site)
      expect(source).toContain('<CommonResourceListFrame')
      for (const prop of ['pagination-align', 'pagination-color', 'pagination-active-color', 'pagination-show-range', 'pagination-ui']) {
        expect(source, `${site} should not pass ${prop}`).not.toContain(prop)
      }
    }

    // The frame must not re-expose those knobs either.
    for (const prop of ['paginationAlign', 'paginationColor', 'paginationActiveColor', 'paginationShowRange', 'paginationUi']) {
      expect(resourceList, `frame should not declare ${prop}`).not.toContain(prop)
    }
  })

  it('shows the fixed mini bar only while the main bar is off screen', () => {
    const pagination = readAppFile('components/common/PaginationBar.vue')
    const css = readAppFile('assets/css/main.css')
    const visibility = readAppFile('composables/layout/useMiniBarVisibility.ts')

    expect(pagination).toContain('ref="mainBar"')
    expect(pagination).toContain('useMiniBarVisibility(mainBar)')
    expect(pagination).toContain('const showMini = computed(() => hasPagination.value && isMiniVisible.value)')
    expect(pagination).toContain('<Teleport to="body">')
    expect(pagination).toContain('eapp-pagination-mini fixed inset-x-3 bottom-3')

    // The handoff must be driven by an observer on the main bar, with a reserve
    // band so the mini bar retires before the main bar reaches the fold.
    expect(visibility).toContain('IntersectionObserver')
    expect(visibility).toContain('HANDOFF_GAP_PX')
    expect(visibility).toContain('rootMargin')
    expect(visibility).toContain('isMiniVisible.value = !record.isIntersecting')
    expect(visibility).toContain('observer.disconnect()')

    const miniRule = css.match(/\.eapp-pagination-mini \{[^}]*\}/)?.[0]
    expect(miniRule, 'mini pagination rule should exist').toBeDefined()
    expect(pagination).toContain('rounded-[var(--radius-panel)]')
    expect(miniRule).toContain('border: 1px solid var(--card-border)')
    expect(miniRule).toContain('box-shadow: var(--card-shadow-hover)')
    expect(miniRule).toContain('env(safe-area-inset-bottom)')

    // Over moving content a blur would re-run every frame.
    expect(miniRule).not.toContain('backdrop-filter')
  })

  it('sizes the mini bar controls below the main bar controls on mobile only', () => {
    const pagination = readAppFile('components/common/PaginationBar.vue')

    const mainSize = pagination.match(/<UPagination\s[\s\S]*?\/>/)
    expect(mainSize, 'main pagination should render').not.toBeNull()
    expect(mainSize![0]).toContain('size="sm"')

    // The mini bar is the only pagination on screen once the main bar is scrolled
    // away, so on desktop it stands in at the main bar's own scale. It drops to the
    // smaller control size only below `md`, the app's 768px mobile threshold.
    expect(pagination).toContain("const miniSize = computed(() => (isMobile.value ? 'xs' : 'sm'))")
    expect(pagination).toContain(':size="miniSize"')
    expect(pagination).not.toMatch(/size="xs"/)
  })

  it('hides only the jump-to-ends controls on mobile', () => {
    const pagination = readAppFile('components/common/PaginationBar.vue')

    // UPagination has no prop for first/last alone: `showControls` also removes
    // prev/next, so the ends are hidden per slot instead.
    expect(pagination).toContain('EDGE_CONTROL_UI')
    expect(pagination).toContain("first: 'max-md:!hidden'")
    expect(pagination).toContain("last: 'max-md:!hidden'")
    expect(pagination).not.toMatch(/:show-controls/)
    expect(pagination).not.toContain('showEdgesResolved')

    // `showEdges` is a reka-ui prop about first/last page + ellipsis in the item
    // window, not about the end controls, so it must not be repurposed for this.
    const edgesBindings = pagination.match(/:show-edges="showEdges"/g) ?? []
    expect(edgesBindings.length, 'both bars pass showEdges through').toBe(2)
  })

  it('never binds loading to the pagination disabled prop', () => {
    const pagination = readAppFile('components/common/PaginationBar.vue')

    // reka-ui derives prev/next disabled from `page === 1` / `page === pageCount`
    // OR the root `disabled` prop. Wiring the fetch flag there made prev flip
    // enabled -> disabled -> enabled on every page change.
    expect(pagination).not.toMatch(/:disabled=/)
    expect(pagination).not.toMatch(/:show-controls/)

    // Loading is still surfaced, but only through the deferred chip.
    expect(pagination).toContain('useDeferredBusy')
    expect(pagination).toContain('showLoadingChip')
    expect(pagination).toContain('v-if="showLoadingChip"')

    // The chip must not be driven by the raw flag, or it would blink on fast fetches.
    expect(pagination).not.toMatch(/v-if="loading"/)
  })

  it('gates pagination hover feedback to fine pointers', () => {
    const css = readAppFile('assets/css/main.css')
    const selector = '.eapp-pagination :where(a, button):hover'

    // Touch leaves an emulated `:hover` on the last-tapped button, which read as
    // a second selected page. Hover feedback is pointer-only.
    expect(css.split(selector)).toHaveLength(2)

    const mediaOpen = '@media (hover: hover) and (pointer: fine) {'
    const mediaStart = css.indexOf(mediaOpen)
    const mediaEnd = css.indexOf('\n}', mediaStart)
    expect(mediaStart, 'fine-pointer media query should exist').toBeGreaterThan(-1)
    expect(mediaEnd, 'fine-pointer media query should close').toBeGreaterThan(mediaStart)
    expect(css.slice(mediaStart, mediaEnd)).toContain(selector)
  })
})
