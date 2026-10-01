import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { useRouter } from '#app'
import { ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { useDataCollectionPreferences } from '~/composables/menu/useDataCollectionPreferences'

mockNuxtImport('usePageHeaderRegistry', () => () => ({ registerPageHeader: vi.fn() }))
mockNuxtImport('useSettingsPageSize', () => () => ref(20))
mockNuxtImport('usePermissions', () => () => ({ checkPermissionCondition: ({ or }: { or: { route: string }[] }) => or[0]?.route !== '/private' }))
mockNuxtImport('useRoutes', () => () => ({
  routesLoading: ref(false), ensureRoutesLoaded: vi.fn().mockResolvedValue(undefined),
  routes: ref([
    { path: '/zebra', mainTable: { name: 'zebra', description: 'Zebra records' } },
    { path: '/alpha', mainTable: { name: 'alpha', alias: 'Alpha', isSingleRecord: true } },
    { path: '/private', mainTable: { name: 'private' } },
    { path: '/system', mainTable: { name: 'system', isSystem: true } },
    { path: '/disabled', isEnabled: false, mainTable: { name: 'disabled' } },
  ]),
}))

import DirectoryPage from '~/pages/data/index.vue'

describe('Browse all data directory', () => {
  it('renders only permitted collections in native table columns and opens the selected collection', async () => {
    const wrapper = await mountSuspended(DirectoryPage, { route: '/data' })
    try {
      await flushPromises()
      expect(wrapper.findAll('table')).toHaveLength(1)
      expect(wrapper.get('thead').text()).toContain('Collection')
      expect(wrapper.get('thead').text()).toContain('API path')
      expect(wrapper.get('thead').text()).toContain('Description')
      expect(wrapper.findAll('tbody tr')).toHaveLength(2)
      expect(wrapper.get('tbody').text()).not.toMatch(/private|system|disabled/)
      await wrapper.get('tbody tr').trigger('click')
      await expect.poll(() => useRouter().currentRoute.value.path).toBe('/data/alpha')
      expect(useDataCollectionPreferences().prefs.value.recent[0]).toBe('alpha')
    } finally { wrapper.unmount() }
  })

  it('keeps pin actions separate from row navigation and searches the whole directory', async () => {
    const wrapper = await mountSuspended(DirectoryPage, { route: '/data' })
    try {
      await flushPromises()
      await wrapper.get('[aria-label="Pin zebra"]').trigger('click')
      expect(useRouter().currentRoute.value.path).toBe('/data')
      expect(useDataCollectionPreferences().isPinned('zebra')).toBe(true)
      expect(wrapper.findAll('tbody tr')[0]!.text()).toContain('zebra')
      await wrapper.get('#collection-search').setValue('/alpha')
      expect(wrapper.findAll('tbody tr')).toHaveLength(1)
      expect(wrapper.get('tbody').text()).toContain('Alpha')
      expect(wrapper.get('tbody').text()).toContain('Single')
      await wrapper.get('#collection-search').setValue('missing')
      expect(wrapper.text()).toContain('No collections found')
    } finally {
      if (useDataCollectionPreferences().isPinned('zebra')) useDataCollectionPreferences().togglePin('zebra')
      wrapper.unmount()
    }
  })
})
