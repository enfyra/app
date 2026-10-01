import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { UPagination, USelect } from '#components'
import DataTable from '~/components/data-table/DataTable.vue'
import DataTableLazy from '~/components/data-table/DataTableLazy.vue'

const mounted: { unmount: () => void }[] = []
afterEach(() => { mounted.splice(0).forEach(wrapper => wrapper.unmount()) })

const props = {
  data: [{ id: 1, name: 'First' }],
  columns: [{ accessorKey: 'name', header: 'Name' }],
  paginationConfig: { mode: 'cursor' as const, itemsPerPage: 10, showPageSize: true, hasMore: true },
}

describe('DataTable cursor footer', () => {
  it('keeps the count and page-size selector while replacing numbered pagination with Load more', async () => {
    const wrapper = await mountSuspended(DataTable, { props })
    mounted.push(wrapper)
    expect(wrapper.text()).toContain('1 loaded')
    expect(wrapper.text()).toContain('Rows per page')
    expect(wrapper.findComponent(UPagination).exists()).toBe(false)
    const button = wrapper.findAll('button').find(button => button.text() === 'Load more')!
    expect(button.exists()).toBe(true)
    await button.trigger('click')
    expect(wrapper.emitted('load-more')).toHaveLength(1)
    const footer = wrapper.get('[aria-label="Table pagination"]')
    expect(footer.classes()).toContain('md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]')
    wrapper.findComponent(USelect).vm.$emit('update:modelValue', 20)
    expect(wrapper.emitted('page-size-change')?.[0]).toEqual([20])
  })

  it('keeps numbered pagination on the right and forwards page changes', async () => {
    const wrapper = await mountSuspended(DataTable, { props: {
      ...props,
      paginationConfig: { total: 105, itemsPerPage: 10, showPageSize: true },
    } })
    mounted.push(wrapper)
    expect(wrapper.get('[aria-label="Table pagination"]').classes()).toContain('md:justify-between')
    const pager = wrapper.findComponent(UPagination)
    expect(pager.classes()).toContain('justify-self-end')
    await pager.get('[aria-label="Next Page"]').trigger('click')
    expect(wrapper.emitted('update:page')?.[0]).toEqual([2])
    expect(wrapper.findAll('button').some(button => button.text() === 'Load more')).toBe(false)
  })

  it('prevents duplicate loads while pending and stops loading after cursor exhaustion', async () => {
    const wrapper = await mountSuspended(DataTable, { props: { ...props, paginationConfig: { ...props.paginationConfig, loading: true } } })
    mounted.push(wrapper)
    const button = () => wrapper.findAll('button').find(button => button.text() === 'Load more')!
    expect(button().attributes('disabled')).toBeDefined()
    await button().trigger('click')
    expect(wrapper.emitted('load-more')).toBeUndefined()
    await wrapper.setProps({ paginationConfig: { ...props.paginationConfig, hasMore: false } })
    expect(button().attributes('disabled')).toBeDefined()
    expect(wrapper.findAll('tbody tr')).toHaveLength(1)
  })

  it('forwards cursor actions through the lazy wrapper and retains custom footer content', async () => {
    const wrapper = await mountSuspended(DataTableLazy, { props, slots: { footer: '<span>Custom summary</span>' } })
    mounted.push(wrapper)
    await flushPromises()
    expect(wrapper.text()).toContain('Custom summary')
    const button = wrapper.findAll('button').find(button => button.text() === 'Load more')!
    await button.trigger('click')
    expect(wrapper.emitted('load-more')).toHaveLength(1)
  })
})
