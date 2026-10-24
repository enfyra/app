import { describe, expect, it } from 'vitest'
import { ensureBoolean, ensureNotNull, ensureNumber, ensureString } from '../../app/utils/components/form'

describe('form value normalization boundaries', () => {
  it('returns text even when JSON serialization produces no value', () => {
    expect(ensureString({ toJSON: () => undefined })).toBe('')
    expect(ensureString({ toJSON: () => null })).toBe('null')
    expect(ensureString(null)).toBe('')
    expect(ensureString({ nested: true })).toBe('{\n  "nested": true\n}')
    const circular: { self?: unknown } = {}
    circular.self = circular
    expect(ensureString(circular)).toBe('')
  })

  it('preserves defined values and normalizes only nullish values', () => {
    const record = { name: 'One' }
    expect(ensureNotNull(record)).toBe(record)
    expect(ensureNotNull(false)).toBe(false)
    expect(ensureNotNull(0)).toBe(0)
    expect(ensureNotNull('')).toBe('')
    expect(ensureNotNull(null)).toBeNull()
    expect(ensureNotNull(undefined)).toBeNull()
    expect(ensureBoolean(false)).toBe(false)
    expect(ensureBoolean('false')).toBe(true)
    expect(ensureNumber('12.5')).toBe(12.5)
    expect(ensureNumber('invalid')).toBe(0)
  })
})
