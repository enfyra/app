import { computed, getCurrentScope, onScopeDispose, ref } from 'vue'
import { useApi } from '../shared/useApi'
import { useConfirm } from '../shared/useConfirm'
import { useDatabase } from '../shared/useDatabase'
import { useNotify } from '../shared/useNotify'
import { usePermissions } from '../shared/usePermissions'
import type { SettingsBulkAction, SettingsBulkDeleteOptions } from '~/types/settings-bulk-action'

export function useSettingsBulkDelete(options: SettingsBulkDeleteOptions) {
  const { getId } = useDatabase()
  const { checkPermissionCondition } = usePermissions()
  const { confirm } = useConfirm()
  const notify = useNotify()
  const { executeWithResult: deleteRecord } = useApi(options.path, { method: 'delete', errorContext: options.title })
  const pending = ref(false)
  let active = true
  if (getCurrentScope()) onScopeDispose(() => { active = false })
  const canDelete = () => checkPermissionCondition({ and: [{ route: options.path, methods: ['DELETE'] }] })
  const isEligible = (row: Record<string, any>) => {
    const id = getId(row)
    return id !== null && id !== undefined && id !== '' && (options.isEligible?.(row) ?? true)
  }

  async function execute(selected: Record<string, any>[]) {
    if (!active || pending.value || !canDelete() || options.isBusy?.()) return []
    const unique = new Set<string>()
    const rows = selected.filter(row => {
      if (!isEligible(row)) return false
      const key = String(getId(row))
      if (unique.has(key)) return false
      unique.add(key)
      return true
    })
    if (!rows.length) return []

    pending.value = true
    const deleted: Record<string, any>[] = []
    let attempted = false
    let refreshFailed = false
    try {
      const confirmed = await confirm({
        title: options.title,
        content: `Delete ${rows.length} selected record(s)? ${options.warning ?? 'This action cannot be undone.'}`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
      })
      if (!confirmed) return []
      for (const row of rows) {
        if (!active || !canDelete() || options.isBusy?.()) break
        if (!isEligible(row)) continue
        attempted = true
        try {
          const result = await deleteRecord({ id: getId(row) })
          if (result.ok) deleted.push(row)
        } catch {
          // Reconcile the list even when the server may have applied a failed request.
        }
      }
      if (!attempted) return []
      if (deleted.length) {
        try {
          await options.onDeleted?.(deleted)
        } catch {
          refreshFailed = true
          notify.error('Refresh failed', 'Records were deleted, but related state could not be refreshed. Reload before continuing.')
        }
      }
      try {
        await options.refresh()
      } catch {
        refreshFailed = true
        notify.error('Refresh failed', 'The current list could not be refreshed. Reload before continuing.')
      }
      const failedCount = rows.length - deleted.length
      if (failedCount) notify.error('Deletion incomplete', `${deleted.length} deleted; ${failedCount} failed or skipped. Unconfirmed records remain selected when still visible.`)
      else if (!refreshFailed) notify.success(options.title, `${deleted.length} record(s) deleted successfully`)
      return deleted.map(row => getId(row) as string | number)
    } finally {
      pending.value = false
    }
  }

  return computed<SettingsBulkAction>(() => ({
    label: 'Delete selected records',
    enabled: canDelete(),
    pending: pending.value,
    isEligible,
    execute,
  }))
}
