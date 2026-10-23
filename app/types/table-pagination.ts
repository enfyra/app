import type { PaginationProps } from '@nuxt/ui'
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
  to?: PaginationProps['to']
}

export type DataTablePaginationConfig = Omit<TablePaginationProps, 'scope'>

export interface CursorPaginationOptions<T, Cursor> {
  itemsPerPage: MaybeRefOrGetter<number>
  getCursor: (row: T) => Cursor
  fetchPage: (cursor: Cursor | null, limit: number) => Promise<T[] | null>
  total?: MaybeRefOrGetter<number | undefined>
  scope?: MaybeRefOrGetter<unknown>
}
