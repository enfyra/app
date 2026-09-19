import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const appDir = join(dirname(fileURLToPath(import.meta.url)), '../../app')
const repoDir = join(appDir, '..')

function readAppFile(path: string) {
  return readFileSync(join(appDir, path), 'utf8')
}

function readRepoFile(path: string) {
  return readFileSync(join(repoDir, path), 'utf8')
}

describe('loading state layout', () => {
  it('does not render mobile table content alongside the initial skeleton', () => {
    const dataTable = readAppFile('components/data-table/DataTable.vue')

    expect(dataTable).toContain('v-if="!showInitialLoading && tableRows.length > 0"')
  })

  it('uses out-in transitions for loading/content swaps where content must not overlap', () => {
    const loadingTransitions = [
      'pages/data/[table]/index.vue',
      'components/guard/RouteGuardSection.vue',
      'pages/settings/guards/index.vue',
      'components/permission/PermissionManager.vue',
      'components/file/FileView.vue',
      'components/folder/FolderView.vue',
      'components/graphql/AccessEditor.vue',
      'pages/settings/routes/index.vue',
      'pages/settings/api-tester/index.vue',
      'pages/settings/methods/index.vue',
    ]

    for (const path of loadingTransitions) {
      expect(readAppFile(path)).toMatch(/<Transition name="loading-fade" mode="out-in"/)
    }

    expect(readAppFile('components/dynamic/PageComponent.vue')).toContain('<Transition name="fade" mode="out-in">')
  })

  it('keeps existing list content visible while a refresh is pending', () => {
    const resourceListItem = readAppFile('components/common/ResourceListItem.vue')

    expect(resourceListItem).toContain('const isSkeletonLoading = computed(() => isLoading.value && !hasContent.value);')
    expect(resourceListItem).toContain("isRefreshing ? 'eapp-resource-list-item-refreshing' : ''")
  })

  it('shows one loading message and one splash for the whole backend wait', () => {
    const splash = readAppFile('plugins/00-loading.client.ts')

    const messageElements = splash.match(/<p id="app-loading-message"/g) ?? []
    expect(messageElements).toHaveLength(1)
    expect(splash.match(/Loading your project…/g) ?? []).toHaveLength(1)
    expect(splash).not.toMatch(/Starting your project/)
  })

  it('surfaces a retryable error state when the backend wait cannot finish', () => {
    const splash = readAppFile('plugins/00-loading.client.ts')

    expect(splash).toContain("loading?.setAttribute('data-state', 'error')")
    expect(splash).toContain("message.textContent = 'Your project is taking longer to start.'")
    expect(splash).toContain("{ once: true }")
    expect(splash).toContain('if (failed || !mounted.value || !initialReady.value) return;')
  })

  it('shares one hard-coded readiness budget between the gate and the browser', () => {
    const constants = readAppFile('constants/enfyra.ts')
    const gate = readRepoFile('server/utils/backend-readiness.ts')
    const splash = readAppFile('plugins/00-loading.client.ts')

    expect(constants).toMatch(/BACKEND_READINESS_TIMEOUT_MS = \d+/)
    expect(gate).toContain("import { BACKEND_READINESS_TIMEOUT_MS } from '~/constants/enfyra'")
    expect(gate).toContain('timeoutMs = BACKEND_READINESS_TIMEOUT_MS')
    expect(splash).toContain('BACKEND_READINESS_TIMEOUT_MS + BACKEND_READINESS_TRANSPORT_MARGIN_MS')
    expect(readRepoFile('nuxt.config.ts')).not.toMatch(/[Rr]eadiness.*process\.env/)
  })
})
