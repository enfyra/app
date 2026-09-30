export interface TablePaginationProps {
  total: number
  itemsPerPage: number
  loading?: boolean
  showPageSize?: boolean
  scope?: HTMLElement | null
  to?: (page: number) => any
}
