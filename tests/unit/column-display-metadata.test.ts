import { describe, expect, it } from 'vitest'
import { tableCellMaxLength, withRichTextMetadata, withTableCellMetadata } from '~/utils/column-display-metadata'

describe('column display metadata', () => {
  it('preserves independent rich text and table cell settings', () => {
    const original = { richText: { toolbar: 'bold italic' }, customFlag: true }
    const withCell = withTableCellMetadata(original, { formatter: 'function formatCell(metadata, value) { return value; }', maxLength: 40 })
    expect(withCell).toEqual({ ...original, tableCell: { formatter: 'function formatCell(metadata, value) { return value; }', maxLength: 40 } })
    expect(tableCellMaxLength(withCell)).toBe(40)
    expect(withRichTextMetadata(withCell, { plugins: ['link'] })).toEqual({
      richText: { plugins: ['link'] }, customFlag: true, tableCell: withCell?.tableCell,
    })
    expect(original).toEqual({ richText: { toolbar: 'bold italic' }, customFlag: true })
  })

  it('removes empty settings without erasing unrelated metadata', () => {
    expect(withTableCellMetadata({ richText: { toolbar: 'bold' }, tableCell: { formatter: 'old', maxLength: 20 } }, { formatter: '', maxLength: null }))
      .toEqual({ richText: { toolbar: 'bold' } })
    expect(withRichTextMetadata({ tableCell: { maxLength: 30 }, richText: { toolbar: 'bold' } }, { toolbar: undefined }))
      .toEqual({ tableCell: { maxLength: 30 } })
  })
})
