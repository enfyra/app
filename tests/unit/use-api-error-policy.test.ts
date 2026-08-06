import { describe, expect, it } from 'vitest'

import { shouldNavigateToErrorPage } from '~/composables/shared/useApi'

describe('useApi error escalation', () => {
  it('keeps forbidden and missing requests local', () => {
    expect(shouldNavigateToErrorPage({ status: 403 }, 'GET')).toBe(false)
    expect(shouldNavigateToErrorPage({ status: 403 }, 'PATCH')).toBe(false)
    expect(shouldNavigateToErrorPage({ status: 404 }, 'GET')).toBe(false)
  })

  it('keeps server failures fatal by default', () => {
    expect(shouldNavigateToErrorPage({ status: 500 }, 'GET')).toBe(true)
  })
})
