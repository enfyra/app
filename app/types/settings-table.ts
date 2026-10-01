import type { ColumnDef } from '@tanstack/vue-table'
import type { DataTableRowAction } from './data-table-columns'

export type SettingsTableCellStyle<Context> = string | Record<string, string> | ((context: Context) => string | Record<string, string>)

export interface SettingsTableProps {
  data: Record<string, any>[]
  columns: ColumnDef<Record<string, any>>[]
  loading?: boolean
  compact?: boolean
  actions?: (row: Record<string, any>) => DataTableRowAction[]
  total?: number
  pageLimit?: number
  pageSizeKey?: string
  paginationLoading?: boolean
  to?: (page: number) => any
}
