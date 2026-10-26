export interface SettingsBulkAction<TRow = Record<string, unknown>> {
  label: string
  enabled: boolean
  pending: boolean
  isEligible?: (row: TRow) => boolean
  execute: (rows: TRow[]) => Promise<(string | number)[]>
}

export interface SettingsBulkDeleteOptions<TRow = Record<string, unknown>> {
  path: string
  title: string
  warning?: string
  isEligible?: (row: TRow) => boolean
  isBusy?: () => boolean
  refresh: () => unknown | Promise<unknown>
  onDeleted?: (rows: TRow[]) => unknown | Promise<unknown>
}
