import type { MaybeRefOrGetter } from 'vue'

export interface TablePaginationProps {
  mode?: 'offset' | 'cursor'
  total?: number
  itemsPerPage: number
  loading?: boolean
  showPageSize?: boolean
  rowCount?: number
  hasNextPage?: boolean
  floating?: boolean
  scope?: HTMLElement | null
  to?: (page: number) => any
}

export type DataTablePaginationConfig = Omit<TablePaginationProps, 'scope'>

export interface CursorPaginationOptions<T, Cursor> {
  itemsPerPage: number
  getCursor: (row: T) => Cursor
  fetchPage: (cursor: Cursor | null, limit: number) => Promise<T[] | null>
  scope?: MaybeRefOrGetter<unknown>
}
