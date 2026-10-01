import { describe, expect, it } from 'vitest'
import { DEFAULT_TABLE_CELL_MAX_LENGTH, TABLE_CELL_FORMATTER_EXAMPLE, formatTableCell, normalizeTableCellResult, resolveTableCellDisplay, validateTableCellFormatter } from '~/utils/data-table-cell-formatter'

describe('column table cell formatter contract', () => {
  it('accepts a function with metadata and value parameters', () => {
    expect(validateTableCellFormatter('(metadata, value) => `${metadata.label}: ${value}`')).toBeNull()
    expect(validateTableCellFormatter('function (metadata, value) { return value }')).toBeNull()
    expect(validateTableCellFormatter('function formatCell(metadata, value) {\n  return { text: value ?? "_", color: "primary", variant: "soft" };\n}')).toBeNull()
    expect(validateTableCellFormatter('(metadata, value) => (value ?? "_")')).toBeNull()
    expect(validateTableCellFormatter(TABLE_CELL_FORMATTER_EXAMPLE)).toBeNull()
  })

  it('rejects non-functions and wrong parameter contracts', () => {
    expect(validateTableCellFormatter('42')).toBeTruthy()
    expect(validateTableCellFormatter('(value) => value')).toBeTruthy()
    expect(validateTableCellFormatter('(metadata, value) => {')).toBeTruthy()
  })

  it('reads column metadata and value without executing arbitrary browser code', () => {
    expect(formatTableCell('(metadata, value) => metadata.label + ": " + value', { label: 'Score' }, 12)).toEqual({ text: 'Score: 12' })
    expect(formatTableCell('(metadata, value) => value ? { text: metadata.active, color: "success" } : "_"', { active: 'Active' }, true)).toEqual({ text: 'Active', color: 'success' })
    expect(validateTableCellFormatter('(metadata, value) => fetch("https://example.com")')).toBeTruthy()
    expect(validateTableCellFormatter('(metadata, value) => value.constructor')).toBeTruthy()
    expect(validateTableCellFormatter('(metadata, value) => ({ __proto__: value })')).toBeTruthy()
  })

  it('shows an underscore for missing values and preserves the underlying record', () => {
    const record = { completed_at: null }
    expect(resolveTableCellDisplay({}, record.completed_at)).toEqual({ text: '_' })
    expect(resolveTableCellDisplay({ tableCell: { formatter: '(metadata, value) => value ?? "Missing"' } }, record.completed_at)).toEqual({ text: 'Missing' })
    expect(record.completed_at).toBeNull()
  })

  it('caps both ordinary and formatted text without changing source values', () => {
    const longValue = 'A'.repeat(DEFAULT_TABLE_CELL_MAX_LENGTH + 15)
    const expected = `${'A'.repeat(DEFAULT_TABLE_CELL_MAX_LENGTH - 1)}…`
    expect(resolveTableCellDisplay({}, longValue).text).toBe(expected)
    expect(resolveTableCellDisplay({ tableCell: { maxLength: 8 } }, longValue).text).toBe('AAAAAAA…')
    expect(resolveTableCellDisplay({ tableCell: { maxLength: 8, formatter: '(metadata, value) => ({ text: value, color: "primary" })' } }, longValue)).toEqual({ text: 'AAAAAAA…', color: 'primary' })
    expect(resolveTableCellDisplay({ tableCell: { maxLength: 0 } }, longValue).text).toBe(expected)
    expect(longValue).toHaveLength(DEFAULT_TABLE_CELL_MAX_LENGTH + 15)
  })

  it('normalizes only display-safe text or a controlled badge', () => {
    expect(normalizeTableCellResult('Ready')).toEqual({ text: 'Ready' })
    expect(normalizeTableCellResult(12)).toEqual({ text: '12' })
    expect(normalizeTableCellResult({ text: 'Ready', color: 'success', variant: 'soft' })).toEqual({ text: 'Ready', color: 'success', variant: 'soft' })
    expect(normalizeTableCellResult({ text: '<script>alert(1)</script>', html: '<b>bad</b>', color: 'invalid' })).toEqual({ text: '<script>alert(1)</script>' })
    expect(normalizeTableCellResult({ html: '<b>bad</b>' })).toBeNull()
  })
})
