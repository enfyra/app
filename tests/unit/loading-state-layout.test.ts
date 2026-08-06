import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const appDir = join(dirname(fileURLToPath(import.meta.url)), '../../app')

function readAppFile(path: string) {
  return readFileSync(join(appDir, path), 'utf8')
}

describe('loading state layout', () => {
  it('does not render mobile table content alongside the initial skeleton', () => {
    const dataTable = readAppFile('components/data-table/DataTable.vue')

    expect(dataTable).toContain('v-if="!showInitialLoading && tableRows.length > 0"')
  })

  it('uses out-in transitions for loading/content swaps', () => {
    const loadingTransitions = [
      'pages/data/[table]/index.vue',
      'components/guard/RouteGuardSection.vue',
      'pages/settings/guards/index.vue',
      'components/permission/PermissionManager.vue',
      'components/file/FileView.vue',
      'components/folder/FolderView.vue',
      'components/graphql/AccessEditor.vue',
      'pages/settings/admin/logs.vue',
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
})
