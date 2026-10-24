import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import FileManager from '~/components/file/FileManager.vue'
import FileManagerToolbar from '~/components/file/FileManagerToolbar.vue'

mockNuxtImport('useHeaderActionRegistry', () => () => ({ register: vi.fn() }))
mockNuxtImport('usePermissions', () => () => ({ hasPermission: () => true, checkPermissionCondition: () => true }))
mockNuxtImport('useDatabase', () => () => ({ getId: (row: Record<string, unknown>) => row.id ?? row._id }))
mockNuxtImport('useApi', () => () => ({ data: ref(null), pending: ref(false), error: ref(null), execute: vi.fn(), executeWithResult: vi.fn() }))
mockNuxtImport('useNotify', () => () => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() }))
mockNuxtImport('useConfirm', () => () => ({ confirm: vi.fn() }))
mockNuxtImport('useFileManagerViewMode', () => () => {
  const viewMode = ref<'grid' | 'list'>('grid')
  return { viewMode, setViewMode: (mode: 'grid' | 'list') => { viewMode.value = mode } }
})

describe('File Manager panel toolbar', () => {
  it('registers view mode and menu as section actions with live props and events', async () => {
    const wrapper = await mountSuspended(FileManager, {
      route: '/storage/management',
      props: { title: 'File Manager', description: 'Organize files', files: [{ id: 1, filename: 'backup.sql.gz' }] },
      global: { stubs: { FileManagerActions: true, FileView: true, FolderView: true } },
    })
    try {
      await flushPromises()
      const header = wrapper.get('[data-slot="header"]')
      expect(header.get('h2').text()).toBe('File Manager')
      expect(header.text()).toContain('Organize files')
      expect(header.find('[aria-hidden="true"].border-t').exists()).toBe(true)
      expect(header.findAll('h2')).toHaveLength(1)
      const toolbar = wrapper.getComponent(FileManagerToolbar)
      expect(toolbar.props('fileCount')).toBe(1)
      expect(toolbar.props('viewMode')).toBe('grid')
      await toolbar.get('[aria-label="List view"]').trigger('click')
      expect(toolbar.props('viewMode')).toBe('list')
      expect(toolbar.get('[aria-label="List view"]').attributes('aria-pressed')).toBe('true')
      toolbar.vm.$emit('refresh')
      toolbar.vm.$emit('createFolder')
      expect(wrapper.emitted('refreshItems')).toEqual([[]])
      expect(wrapper.emitted('createFolder')).toEqual([[]])
      await wrapper.setProps({ files: [{ id: 1 }, { id: 2 }], filesLoading: true })
      expect(toolbar.props('fileCount')).toBe(2)
      expect(toolbar.props('loading')).toBe(true)
    } finally { wrapper.unmount() }
  })
})
