import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, describe, expect, it } from 'vitest'
import { UPagination, USelect } from '#components'
import TablePagination from '~/components/data-table/Pagination.vue'

const mounted: { unmount: () => void }[] = []
afterEach(() => { mounted.splice(0).forEach(wrapper => wrapper.unmount()) })

function expectPaginationTheme(root: { classes: () => string[]; get: (selector: string) => { classes: () => string[] } }) {
  expect(root.classes()).toContain('eapp-pagination-controls')
  expect(root.classes()).toContain('border-t')
  expect(root.classes()).toContain('md:border-t-0')
  expect(root.classes()).toContain('pt-3')
  expect(root.classes()).toContain('md:pt-0')
  expect(root.get('[data-slot="list"]').classes()).toContain('justify-end')
  expect(root.get('[data-slot="list"]').classes()).not.toContain('justify-center')
}

describe('global pagination theme', () => {
  it('keeps raw UPagination right-aligned with a mobile-only separator for extension consumers', async () => {
    const wrapper = await mountSuspended(UPagination, { props: { total: 100 } })
    mounted.push(wrapper)
    expectPaginationTheme(wrapper)
  })

  it('uses the same compact select chrome without a footer override', async () => {
    const wrapper = await mountSuspended(USelect, { props: { items: [10, 20, 50, 100], modelValue: 20, size: 'sm' } })
    mounted.push(wrapper)
    const trigger = wrapper.get('[role="combobox"]')
    expect(trigger.classes()).toContain('h-8')
    expect(trigger.classes()).not.toContain('h-11')
    expect(trigger.classes()).toContain('!ring-0')
  })

  it('keeps main and mini table pagers on the same global theme', async () => {
    const wrapper = await mountSuspended(TablePagination, { props: { total: 100, itemsPerPage: 10 } })
    mounted.push(wrapper)
    const pagers = wrapper.findAllComponents(UPagination)
    expect(pagers).toHaveLength(2)
    pagers.forEach(pager => expectPaginationTheme(pager.get('[data-slot="root"]')))
  })
})
