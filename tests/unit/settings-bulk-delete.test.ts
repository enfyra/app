import { beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope } from 'vue'
import { useSettingsBulkDelete } from '../../app/composables/data-table/useSettingsBulkDelete'

const mocks = vi.hoisted(() => ({ allowed: true, confirm: vi.fn(), execute: vi.fn(), notify: { success: vi.fn(), error: vi.fn() } }))
vi.mock('../../app/composables/shared/useApi', () => ({ useApi: () => ({ executeWithResult: mocks.execute }) }))
vi.mock('../../app/composables/shared/useDatabase', () => ({ useDatabase: () => ({ getId: (row: any) => row.id ?? row._id }) }))
vi.mock('../../app/composables/shared/usePermissions', () => ({ usePermissions: () => ({ checkPermissionCondition: () => mocks.allowed }) }))
vi.mock('../../app/composables/shared/useConfirm', () => ({ useConfirm: () => ({ confirm: mocks.confirm }) }))
vi.mock('../../app/composables/shared/useNotify', () => ({ useNotify: () => mocks.notify }))

beforeEach(() => {
  vi.clearAllMocks()
  mocks.allowed = true
  mocks.confirm.mockResolvedValue(true)
  mocks.execute.mockResolvedValue({ ok: true })
})

function setup(extra = {}) {
  return useSettingsBulkDelete({ path: '/records', title: 'Delete Records', refresh: vi.fn(), ...extra })
}

describe('explicit settings bulk deletion', () => {
  it('never writes when permission is denied or confirmation is cancelled', async () => {
    const action = setup()
    mocks.allowed = false
    expect(await action.value.execute([{ id: 1 }])).toEqual([])
    expect(mocks.confirm).not.toHaveBeenCalled()
    mocks.allowed = true
    mocks.confirm.mockResolvedValue(false)
    expect(await action.value.execute([{ id: 1 }])).toEqual([])
    expect(mocks.execute).not.toHaveBeenCalled()
  })

  it('rechecks permission and record eligibility after confirmation', async () => {
    const row = { id: 1, isSystem: false }
    const action = setup({ isEligible: (record: any) => !record.isSystem })
    mocks.confirm.mockImplementation(async () => { row.isSystem = true; return true })
    expect(await action.value.execute([row])).toEqual([])
    expect(mocks.execute).not.toHaveBeenCalled()
    mocks.confirm.mockImplementation(async () => { mocks.allowed = false; return true })
    row.isSystem = false
    expect(await action.value.execute([row])).toEqual([])
    expect(mocks.execute).not.toHaveBeenCalled()
  })

  it('filters protected and invalid IDs, deduplicates and preserves Mongo identifiers', async () => {
    const action = setup({ isEligible: (row: any) => !row.isSystem })
    expect(await action.value.execute([{ id: 1, isSystem: true }, { id: '' }, {}, { _id: 'mongo' }, { _id: 'mongo' }])).toEqual(['mongo'])
    expect(mocks.execute).toHaveBeenCalledExactlyOnceWith({ id: 'mongo' })
  })

  it('reconciles partial success and refreshes even when some deletes fail', async () => {
    const refresh = vi.fn()
    const onDeleted = vi.fn()
    mocks.execute.mockResolvedValueOnce({ ok: true }).mockResolvedValueOnce({ ok: false }).mockResolvedValueOnce({ ok: true })
    const action = setup({ refresh, onDeleted })
    expect(await action.value.execute([{ id: 1 }, { id: 2 }, { id: 3 }])).toEqual([1, 3])
    expect(onDeleted).toHaveBeenCalledWith([{ id: 1 }, { id: 3 }])
    expect(refresh).toHaveBeenCalledOnce()
    expect(mocks.notify.error).toHaveBeenCalledWith('Deletion incomplete', expect.stringContaining('1'))
    expect(action.value.pending).toBe(false)
  })

  it('serializes batches and stops remaining writes when permission changes', async () => {
    const refresh = vi.fn()
    const action = setup({ refresh })
    mocks.confirm.mockImplementation(async () => {
      expect(await action.value.execute([{ id: 99 }])).toEqual([])
      return true
    })
    mocks.execute.mockImplementation(async () => { mocks.allowed = false; return { ok: true } })
    expect(await action.value.execute([{ id: 1 }, { id: 2 }])).toEqual([1])
    expect(mocks.execute).toHaveBeenCalledExactlyOnceWith({ id: 1 })
    expect(refresh).toHaveBeenCalledOnce()
  })

  it('does not write after the page is disposed while confirmation is open', async () => {
    const scope = effectScope()
    const action = scope.run(() => setup())!
    mocks.confirm.mockImplementation(async () => { scope.stop(); return true })
    expect(await action.value.execute([{ id: 1 }])).toEqual([])
    expect(mocks.execute).not.toHaveBeenCalled()
  })

  it('does not start while another domain mutation is active', async () => {
    const action = setup({ isBusy: () => true })
    expect(await action.value.execute([{ id: 1 }])).toEqual([])
    expect(mocks.confirm).not.toHaveBeenCalled()
    expect(mocks.execute).not.toHaveBeenCalled()
  })

  it('still refreshes the list after related-state failure and does not report a clean completion', async () => {
    const refresh = vi.fn()
    const action = setup({ refresh, onDeleted: vi.fn().mockRejectedValue(new Error('Cache unavailable')) })
    expect(await action.value.execute([{ id: 1 }])).toEqual([1])
    expect(refresh).toHaveBeenCalledOnce()
    expect(mocks.notify.error).toHaveBeenCalledWith('Refresh failed', expect.any(String))
    expect(mocks.notify.success).not.toHaveBeenCalled()
  })

  it('refreshes after a rejected request without claiming success', async () => {
    const refresh = vi.fn()
    mocks.execute.mockRejectedValue(new Error('Request failed'))
    const action = setup({ refresh })
    expect(await action.value.execute([{ id: 1 }])).toEqual([])
    expect(refresh).toHaveBeenCalledOnce()
    expect(mocks.notify.success).not.toHaveBeenCalled()
  })
})
