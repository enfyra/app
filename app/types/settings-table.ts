import type { ColumnDef } from '@tanstack/vue-table'
import type { DataTableRowAction } from './data-table-columns'
import type { SettingsBulkAction } from './settings-bulk-action'

export type SettingsTableCellStyle<Context> = string | Record<string, string> | ((context: Context) => string | Record<string, string>)

export interface SettingsTableProps {
  data: Record<string, any>[]
  columns: ColumnDef<Record<string, any>>[]
  loading?: boolean
  compact?: boolean
  actions?: (row: Record<string, any>) => DataTableRowAction[]
  total?: number
  headerName: string
  headerDescription?: string
  searchable?: boolean
  searchPlaceholder?: string
  searchLabel?: string
  pageLimit?: number
  pageSizeKey?: string
  paginationLoading?: boolean
  paginationMode?: 'offset' | 'cursor'
  hasNextPage?: boolean
  to?: (page: number) => any
  reload?: () => unknown | Promise<unknown>
  reloadLoading?: boolean
  enableRowSelection?: boolean
  bulkAction?: SettingsBulkAction
  selectionDisabled?: boolean
}
