import type { CellContext, ColumnDef } from '@tanstack/vue-table'
import type { VNodeChild } from 'vue'
import type { DataTableRowAction } from './data-table-columns'
import type { SettingsBulkAction } from './settings-bulk-action'
import type { TablePaginationProps } from './table-pagination'

export interface SettingsTableValueColumn<TRow = Record<string, unknown>> {
  accessorKey: string
  header: string
  enableSorting: false
  cell: (context: Pick<CellContext<TRow, unknown>, 'getValue'>) => VNodeChild
}

export type SettingsTableCellStyle<Context> = string | Record<string, string> | ((context: Context) => string | Record<string, string>)

export interface SettingsTableProps<TRow extends object = Record<string, unknown>> {
  data: TRow[]
  columns: ColumnDef<TRow>[]
  loading?: boolean
  compact?: boolean
  actions?: (row: TRow) => DataTableRowAction<TRow>[]
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
  to?: TablePaginationProps['to']
  reload?: () => unknown | Promise<unknown>
  reloadLoading?: boolean
  enableRowSelection?: boolean
  bulkAction?: SettingsBulkAction<TRow>
  selectionDisabled?: boolean
}
