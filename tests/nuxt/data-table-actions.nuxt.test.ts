import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { defineComponent, h, ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useDataTableActions } from '~/composables/data-table/useDataTableActions'

const mocks = vi.hoisted(() => ({ single: vi.fn(), batch: vi.fn(), confirm: vi.fn(), refresh: vi.fn(), success: vi.fn() }))
mockNuxtImport('useApi', () => (_url: unknown, options: { batch?: boolean }) => ({ executeWithResult: options.batch ? mocks.batch : mocks.single }))
mockNuxtImport('useDatabase', () => () => ({ getId: (row: { id?: unknown }) => row.id }))
mockNuxtImport('useConfirm', () => () => ({ confirm: mocks.confirm }))
mockNuxtImport('useNotify', () => () => ({ success: mocks.success }))
mockNuxtImport('usePermissions', () => () => ({ hasPermission: () => true }))
mockNuxtImport('useLoader', () => () => ({ createLoader: () => ({ withLoading: (callback: () => Promise<void>) => callback() }) }))

type RecordRow = { id?: number; name: string }

beforeEach(() => {
  vi.clearAllMocks()
  mocks.confirm.mockResolvedValue(true)
  mocks.single.mockResolvedValue({ ok: true })
  mocks.batch.mockResolvedValue({ ok: true })
})

async function mountActions() {
  let actions: ReturnType<typeof useDataTableActions<RecordRow>> | undefined
  const wrapper = await mountSuspended(defineComponent({ setup() {
    actions = useDataTableActions('records', mocks.refresh, ref<RecordRow[]>([]))
    return () => h('div')
  } }))
  if (!actions) throw new Error('Table actions did not initialize')
  return { wrapper, actions }
}

describe('DataTable record mutation contracts', () => {
  it('uses the single identifier client for row deletion and the explicit batch client for selected records', async () => {
    const { wrapper, actions } = await mountActions()
    try {
      await actions.handleDelete('one')
      expect(mocks.single).toHaveBeenCalledExactlyOnceWith({ id: 'one' })
      expect(mocks.batch).not.toHaveBeenCalled()
      await actions.handleBulkDelete([{ id: 1, name: 'First' }, { id: 2, name: 'Second' }])
      expect(mocks.batch).toHaveBeenCalledExactlyOnceWith({ ids: [1, 2] })
      expect(mocks.refresh).toHaveBeenCalledTimes(2)
    } finally { wrapper.unmount() }
  })

  it('rejects invalid logical identifiers before starting a batch instead of reporting skipped rows as deleted', async () => {
    const { wrapper, actions } = await mountActions()
    try {
      await expect(actions.handleBulkDelete([{ id: 1, name: 'Valid' }, { name: 'Invalid' }])).rejects.toThrow('Selected record has no valid identifier')
      expect(mocks.single).not.toHaveBeenCalled()
      expect(mocks.batch).not.toHaveBeenCalled()
      expect(mocks.refresh).not.toHaveBeenCalled()
      expect(mocks.success).not.toHaveBeenCalled()
    } finally { wrapper.unmount() }
  })
})
