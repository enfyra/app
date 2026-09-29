import { DEFAULT_TABLE_CELL_MAX_LENGTH } from '~/utils/data-table-cell-formatter'
import type { ColumnTableCellMetadata } from '~/types/table-cell-formatter'
import type { RichTextEditorConfig } from '~/types/rich-text-editor'

export function withTableCellMetadata(
  original: ColumnTableCellMetadata | null | undefined,
  changes: { formatter?: string | null; maxLength?: number | null },
): ColumnTableCellMetadata | null {
  const metadata = { ...(original ?? {}) }
  const tableCell = { ...(metadata.tableCell ?? {}) }
  if ('formatter' in changes) {
    if (changes.formatter?.trim()) tableCell.formatter = changes.formatter
    else delete tableCell.formatter
  }
  if ('maxLength' in changes) {
    if (changes.maxLength && Number.isInteger(changes.maxLength) && changes.maxLength > 0 && changes.maxLength <= 4096) {
      tableCell.maxLength = changes.maxLength
    } else delete tableCell.maxLength
  }
  if (Object.keys(tableCell).length) metadata.tableCell = tableCell
  else delete metadata.tableCell
  return Object.keys(metadata).length ? metadata : null
}

export function withRichTextMetadata(
  original: ColumnTableCellMetadata | null | undefined,
  config: RichTextEditorConfig | null,
): ColumnTableCellMetadata | null {
  const metadata = { ...(original ?? {}) }
  const cleaned = config ? Object.fromEntries(Object.entries(config).filter(([, value]) => value !== undefined)) : null
  if (cleaned && Object.keys(cleaned).length) metadata.richText = cleaned
  else delete metadata.richText
  return Object.keys(metadata).length ? metadata : null
}

export function tableCellMaxLength(metadata: ColumnTableCellMetadata | null | undefined): number {
  const value = metadata?.tableCell?.maxLength
  return typeof value === 'number' && Number.isInteger(value) && value > 0 && value <= 4096
    ? value : DEFAULT_TABLE_CELL_MAX_LENGTH
}
