import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import PaginationRange from '~/components/common/PaginationRange.vue'

describe('pagination range', () => {
  it('shows only the current row interval', async () => {
    const wrapper = await mountSuspended(PaginationRange, { props: { start: 1, end: 10 } })
    try {
      expect(wrapper.get('[aria-hidden="true"]').text()).toBe('1–10')
      expect(wrapper.attributes('title')).toBe('1–10')
      expect(wrapper.get('.sr-only').text()).toBe('Showing 1 to 10 results')
    } finally {
      wrapper.unmount()
    }
  })

  it('keeps exact million-scale endpoints on separate bounded lines', async () => {
    const wrapper = await mountSuspended(PaginationRange, { props: { start: 1_000_001, end: 1_000_010 } })
    try {
      expect(wrapper.findAll('[aria-hidden="true"]').map(line => line.text())).toEqual(['1,000,001', '– 1,000,010'])
      expect(wrapper.attributes('title')).toBe('1,000,001–1,000,010')
      expect(wrapper.classes()).toContain('max-w-24')
      expect(wrapper.get('.sr-only').text()).toBe('Showing 1,000,001 to 1,000,010 results')
    } finally {
      wrapper.unmount()
    }
  })

  it('keeps the empty result label', async () => {
    const wrapper = await mountSuspended(PaginationRange, { props: { start: 0, end: 0 } })
    try {
      expect(wrapper.get('[aria-hidden="true"]').text()).toBe('0 results')
    } finally {
      wrapper.unmount()
    }
  })
})
