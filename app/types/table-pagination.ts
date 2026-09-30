export interface TablePaginationProps {
  mode?: 'offset' | 'cursor'
  total?: number
  itemsPerPage: number
  loading?: boolean
  showPageSize?: boolean
  loadedCount?: number
  hasMore?: boolean
  scope?: HTMLElement | null
  to?: (page: number) => any
}

export type DataTablePaginationConfig = Omit<TablePaginationProps, 'scope'>
