import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { UPagination, USelect } from '#components'
import DataTable from '~/components/data-table/DataTable.vue'
import DataTableLazy from '~/components/data-table/DataTableLazy.vue'

const mounted: { unmount: () => void }[] = []
afterEach(() => { mounted.splice(0).forEach(wrapper => wrapper.unmount()) })

const props = {
  data: [{ id: 1, name: 'First' }],
  columns: [{ accessorKey: 'name', header: 'Name' }],
  paginationConfig: { mode: 'cursor' as const, itemsPerPage: 10, showPageSize: true, hasNextPage: true },
}

describe('DataTable cursor footer', () => {
  it('keeps the count and page-size selector while showing Previous and Next instead of numbered pagination', async () => {
    const wrapper = await mountSuspended(DataTable, { props })
    mounted.push(wrapper)
    expect(wrapper.text()).toContain('1–1')
    expect(wrapper.text()).toContain('Rows per page')
    expect(wrapper.get('button[aria-label="Previous"]').attributes('disabled')).toBeDefined()
    expect(wrapper.findComponent(UPagination).exists()).toBe(false)
    const button = wrapper.get('button[aria-label="Next"]')
    expect(button.text()).toBe('')
    expect(wrapper.get('button[aria-label="Previous"]').text()).toBe('')
    await button.trigger('click')
    expect(wrapper.emitted('update:page')?.[0]).toEqual([2])
    await wrapper.setProps({ page: 2 })
    await wrapper.get('button[aria-label="Previous"]').trigger('click')
    expect(wrapper.emitted('update:page')?.[1]).toEqual([1])
    const footer = wrapper.get('[aria-label="Table pagination"]')
    expect(footer.classes()).toContain('md:grid-cols-[minmax(0,1fr)_auto_minmax(0,max-content)]')
    const cursorControls = button.element.parentElement!
    expect(cursorControls.classList.contains('mx-auto')).toBe(true)
    expect(cursorControls.classList.contains('md:mx-0')).toBe(true)
    const separator = cursorControls.parentElement!.parentElement!
    expect(separator.classList.contains('max-md:col-span-2')).toBe(true)
    expect(separator.classList.contains('col-span-2')).toBe(false)
    expect(separator.classList.contains('max-md:border-t')).toBe(true)
    expect(separator.classList.contains('border-t')).toBe(false)
    wrapper.findComponent(USelect).vm.$emit('update:modelValue', 20)
    expect(wrapper.emitted('page-size-change')?.[0]).toEqual([20])
  })

  it('keeps numbered pagination on the right and forwards page changes', async () => {
    const wrapper = await mountSuspended(DataTable, { props: {
      ...props,
      paginationConfig: { total: 105, itemsPerPage: 10, showPageSize: true },
    } })
    mounted.push(wrapper)
    expect(wrapper.get('[aria-label="Table pagination"]').classes()).toContain('md:grid-cols-[minmax(0,1fr)_auto_minmax(0,max-content)]')
    const pager = wrapper.findComponent(UPagination)
    await pager.get('[aria-label="Next Page"]').trigger('click')
    expect(wrapper.emitted('update:page')?.[0]).toEqual([2])
    expect(wrapper.findAll('button').some(button => button.text() === 'Load more')).toBe(false)
  })

  it('blocks cursor navigation while pending and disables Next at the end', async () => {
    const wrapper = await mountSuspended(DataTable, { props: { ...props, paginationConfig: { ...props.paginationConfig, loading: true } } })
    mounted.push(wrapper)
    const button = () => wrapper.get('button[aria-label="Next"]')
    expect(button().attributes('disabled')).toBeDefined()
    await button().trigger('click')
    expect(wrapper.emitted('update:page')).toBeUndefined()
    await wrapper.setProps({ paginationConfig: { ...props.paginationConfig, hasNextPage: false } })
    expect(button().attributes('disabled')).toBeDefined()
    expect(wrapper.findAll('tbody tr')).toHaveLength(1)
  })

  it('forwards cursor actions through the lazy wrapper and retains custom footer content', async () => {
    const wrapper = await mountSuspended(DataTableLazy, { props, slots: { footer: '<span>Custom summary</span>' } })
    mounted.push(wrapper)
    await flushPromises()
    expect(wrapper.text()).toContain('Custom summary')
    const button = wrapper.get('button[aria-label="Next"]')
    await button.trigger('click')
    expect(wrapper.emitted('update:page')?.[0]).toEqual([2])
  })

  it('shows only the supplied cursor page and permits returning from the last page', async () => {
    const wrapper = await mountSuspended(DataTable, { props })
    mounted.push(wrapper)
    await wrapper.setProps({
      page: 2,
      data: [{ id: 2, name: 'Second' }],
      paginationConfig: { ...props.paginationConfig, hasNextPage: false },
    })
    expect(wrapper.get('tbody').text()).toContain('Second')
    expect(wrapper.get('tbody').text()).not.toContain('First')
    expect(wrapper.text()).toContain('11–11')
    expect(wrapper.get('button[aria-label="Next"]').attributes('disabled')).toBeDefined()
    await wrapper.get('button[aria-label="Previous"]').trigger('click')
    expect(wrapper.emitted('update:page')?.[0]).toEqual([1])
  })

  it('forwards the declared pagination contract without warnings across mode changes', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const paginationConfig = { mode: 'cursor' as const, itemsPerPage: 10, hasNextPage: true }
      const wrapper = await mountSuspended(DataTable, { props: { ...props, paginationConfig } })
      mounted.push(wrapper)
      expect(wrapper.text()).toContain('1–1')
      await wrapper.get('button[aria-label="Next"]').trigger('click')
      expect(wrapper.emitted('update:page')?.[0]).toEqual([2])
      await wrapper.setProps({ paginationConfig: { ...paginationConfig, mode: 'offset', total: 105 } })
      expect(wrapper.findComponent(UPagination).exists()).toBe(true)
      expect(warn.mock.calls.map(args => args.join(' ')).join('\n')).not.toContain('Extraneous non-props attributes')
    } finally {
      warn.mockRestore()
    }
  })
})
