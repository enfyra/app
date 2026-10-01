export interface ColumnTableCellMetadata {
  tableCell?: {
    formatter?: string | null
    maxLength?: number | null
  } | null
  [key: string]: unknown
}

export type ColumnTableCellResult = string | number | boolean | null | undefined | {
  text: string
  color?: string
  variant?: string
}

export interface TableCellDisplay {
  text: string
  color?: 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral'
  variant?: 'solid' | 'soft' | 'subtle' | 'outline'
}
