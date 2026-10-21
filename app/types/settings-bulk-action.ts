export interface SettingsBulkAction {
  label: string
  enabled: boolean
  pending: boolean
  isEligible?: (row: Record<string, any>) => boolean
  execute: (rows: Record<string, any>[]) => Promise<(string | number)[]>
}

export interface SettingsBulkDeleteOptions {
  path: string
  title: string
  warning?: string
  isEligible?: (row: Record<string, any>) => boolean
  isBusy?: () => boolean
  refresh: () => unknown | Promise<unknown>
  onDeleted?: (rows: Record<string, any>[]) => unknown | Promise<unknown>
}
