import { describe, expect, it } from 'vitest'
import { humanizeIdentifier, resolveLabel } from '~/utils/form/humanize-label'

describe('humanizeIdentifier', () => {
  it('converts snake_case to Title Case', () => {
    expect(humanizeIdentifier('landing_site_settings')).toBe('Landing Site Settings')
  })

  it('converts camelCase to Title Case', () => {
    expect(humanizeIdentifier('siteUrl')).toBe('Site URL')
  })

  it('uppercases known acronyms', () => {
    expect(humanizeIdentifier('api_url')).toBe('API URL')
    expect(humanizeIdentifier('httpMethod')).toBe('HTTP Method')
  })

  it('handles dot-separated segments', () => {
    expect(humanizeIdentifier('contentSet.items')).toBe('Content Set Items')
  })

  it('returns empty string for empty input', () => {
    expect(humanizeIdentifier('')).toBe('')
  })

  it('handles single word', () => {
    expect(humanizeIdentifier('dashboard')).toBe('Dashboard')
  })
})

describe('resolveLabel', () => {
  it('prefers explicit label when present', () => {
    expect(resolveLabel('My Custom Label', 'some_field')).toBe('My Custom Label')
  })

  it('falls back to humanized identifier when label is empty', () => {
    expect(resolveLabel('', 'landing_site_settings')).toBe('Landing Site Settings')
    expect(resolveLabel(null, 'siteUrl')).toBe('Site URL')
    expect(resolveLabel(undefined, 'contentSet')).toBe('Content Set')
  })

  it('falls back to humanized identifier when label is whitespace only', () => {
    expect(resolveLabel('   ', 'my_field')).toBe('My Field')
  })
})
