import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { UPagination, USelect } from '#components'
import TablePagination from '~/components/data-table/Pagination.vue'
import DataTable from '~/components/data-table/DataTable.vue'

const mounted: { unmount: () => void }[] = []
afterEach(() => { mounted.splice(0).forEach(wrapper => wrapper.unmount()) })

describe('table pagination theme boundary', () => {
  it('keeps desktop range, page size and cursor controls on one footer row', async () => {
    const wrapper = await mountSuspended(DataTable, {
      props: {
        data: Array.from({ length: 20 }, (_, index) => ({ id: index + 1 })),
        columns: [{ accessorKey: 'id', header: 'ID' }],
        page: 1,
        paginationConfig: { mode: 'cursor', itemsPerPage: 20, showPageSize: true, hasNextPage: true, floating: false },
      },
    })
    mounted.push(wrapper)
    const footer = wrapper.get('[aria-label="Table pagination"]')
    expect(footer.text()).toContain('1–20')
    expect(footer.find('[aria-label="Rows per page"]').exists()).toBe(true)
    expect(footer.findAll('button').some(button => button.text() === 'Next')).toBe(true)
    expect(footer.classes()).toContain('md:grid-cols-[minmax(0,1fr)_auto_minmax(0,max-content)]')
    expect(footer.classes()).not.toContain('md:flex-wrap')
    expect(footer.classes()).toContain('grid')
  })

  it('uses the numbered pager position and mobile separator for cursor navigation', async () => {
    const wrapper = await mountSuspended(TablePagination, { props: { mode: 'cursor', itemsPerPage: 10, rowCount: 10, hasNextPage: true } })
    mounted.push(wrapper)
    const button = wrapper.findAll('button').find(button => button.text() === 'Next')!
    expect(button.text()).toContain('Next')
    expect(button.element.parentElement!.classList.contains('border-t')).toBe(false)
    const separator = button.element.parentElement!.parentElement!.parentElement!
    expect(separator.classList.contains('border-t')).toBe(false)
    expect(separator.classList.contains('max-md:border-t')).toBe(true)
    expect(separator.classList.contains('max-md:pt-3')).toBe(true)
    expect(separator.classList.contains('max-md:px-3')).toBe(true)
    expect(separator.classList.contains('md:border-t-0')).toBe(false)
    const footer = wrapper.get('[aria-label="Table pagination"]')
    expect(footer.classes()).toContain('md:grid-cols-[minmax(0,1fr)_auto_minmax(0,max-content)]')
    expect(footer.classes()).not.toContain('md:flex-wrap')
    await button.trigger('click')
    expect(wrapper.emitted('update:page')?.[0]).toEqual([2])
  })

  it('renders selection and range together in the pagination summary', async () => {
    const wrapper = await mountSuspended(DataTable, {
      props: {
        data: [{ id: 1 }],
        columns: [{ accessorKey: 'id', header: 'ID' }],
        paginationConfig: { total: 24, itemsPerPage: 10, floating: false },
      },
      slots: { 'pagination-summary': '<span>10 selected</span>' },
    })
    mounted.push(wrapper)
    const summary = wrapper.get('[aria-label="Table pagination"] > div:first-child')
    expect(summary.text()).toContain('10 selected')
    expect(summary.text()).toContain('1–10 / 24')
  })

  it('leaves raw UPagination free of table footer layout and styling', async () => {
    const wrapper = await mountSuspended(UPagination, { props: { total: 100 } })
    mounted.push(wrapper)
    expect(wrapper.classes()).not.toContain('eapp-table-pagination-controls')
    expect(wrapper.classes()).not.toContain('eapp-pagination-controls')
    expect(wrapper.classes()).not.toContain('w-full')
    expect(wrapper.classes()).not.toContain('border-t')
    expect(wrapper.classes()).not.toContain('pt-3')
    expect(wrapper.get('[data-slot="list"]').classes()).not.toContain('flex-wrap')
    expect(wrapper.get('[data-slot="list"]').classes()).not.toContain('justify-end')
  })

  it('uses the same compact select chrome without a footer override', async () => {
    const wrapper = await mountSuspended(USelect, { props: { items: [10, 20, 50, 100], modelValue: 20, size: 'sm' } })
    mounted.push(wrapper)
    const trigger = wrapper.get('[role="combobox"]')
    expect(trigger.classes()).toContain('h-8')
    expect(trigger.classes()).not.toContain('h-11')
    expect(trigger.classes()).toContain('!ring-0')
  })

  it('owns the mobile separator and allows explicitly disabling the floating pager', async () => {
    const wrapper = await mountSuspended(TablePagination, { props: { total: 100, itemsPerPage: 10, floating: false } })
    mounted.push(wrapper)
    const pagers = wrapper.findAllComponents(UPagination)
    expect(pagers).toHaveLength(1)
    const root = pagers[0]!.get('[data-slot="root"]')
    expect(root.classes()).toContain('eapp-table-pagination-controls')
    expect(root.classes()).not.toContain('border-t')
    const scroller = root.element.parentElement!
    expect(scroller.classList.contains('overflow-x-auto')).toBe(true)
    const separator = scroller.parentElement!
    expect(separator.classList.contains('border-t')).toBe(false)
    expect(separator.classList.contains('max-md:border-t')).toBe(true)
    expect(separator.classList.contains('max-md:pt-3')).toBe(true)
    expect(separator.classList.contains('max-md:px-3')).toBe(true)
    expect(separator.classList.contains('md:border-t-0')).toBe(false)
    expect(separator.classList.contains('max-md:-mx-3')).toBe(true)
    expect(separator.classList.contains('max-md:col-span-2')).toBe(true)
    expect(root.get('[data-slot="list"]').classes()).toContain('flex-nowrap')
    expect(root.get('[data-slot="list"]').classes()).not.toContain('flex-wrap')
    expect(root.get('[data-slot="list"]').classes()).toContain('justify-center')
    expect(root.get('[data-slot="list"]').classes()).toContain('md:justify-end')
    const footer = wrapper.get('[aria-label="Table pagination"]')
    expect(footer.classes()).toContain('md:grid-cols-[minmax(0,1fr)_auto_minmax(0,max-content)]')
    expect(footer.classes()).not.toContain('md:flex-wrap')
  })

  it('shows the table mini pager only while its footer is off screen and its table is visible', async () => {
    const observers: { callback: IntersectionObserverCallback; target?: Element }[] = []
    class Observer {
      callback: IntersectionObserverCallback
      target?: Element
      constructor(callback: IntersectionObserverCallback) {
        this.callback = callback
        observers.push(this)
      }
      observe(target: Element) { this.target = target }
      disconnect() {}
    }
    vi.stubGlobal('IntersectionObserver', Observer)
    try {
      const wrapper = await mountSuspended(DataTable, { props: {
        data: [{ id: 1 }], columns: [{ accessorKey: 'id', header: 'ID' }],
        paginationConfig: { total: 105, itemsPerPage: 10 },
      } })
      mounted.push(wrapper)
      const footer = observers.find(observer => observer.target?.getAttribute('aria-label') === 'Table pagination')!
      const scope = observers.find(observer => observer !== footer)!
      expect(footer).toBeDefined()
      expect(scope).toBeDefined()
      const notify = (observer: typeof footer, visible: boolean) => observer.callback(
        [{ target: observer.target, isIntersecting: visible } as IntersectionObserverEntry],
        observer as unknown as IntersectionObserver,
      )
      const mini = wrapper.findAllComponents(UPagination)[1]!.element.parentElement!.parentElement as HTMLElement
      notify(footer, false)
      notify(scope, true)
      await nextTick()
      expect(mini.style.display).not.toBe('none')
      notify(footer, true)
      await nextTick()
      expect(mini.style.display).toBe('none')
      notify(footer, false)
      notify(scope, false)
      await nextTick()
      expect(mini.style.display).toBe('none')
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('keeps the default mini pager on one row with controls left and range right', async () => {
    const wrapper = await mountSuspended(TablePagination, { props: { total: 105, itemsPerPage: 20 } })
    mounted.push(wrapper)
    const pagers = wrapper.findAllComponents(UPagination)
    expect(pagers).toHaveLength(2)
    const mini = pagers[1]!.get('[data-slot="root"]')
    expect(mini.classes()).toContain('eapp-table-pagination-controls')
    expect(mini.classes()).not.toContain('border-t')
    expect(mini.classes()).not.toContain('pt-3')
    expect(mini.classes()).not.toContain('w-full')
    expect(mini.classes()).toContain('w-fit')
    expect(mini.classes()).not.toContain('mx-auto')
    expect(mini.get('[data-slot="list"]').classes()).toContain('flex-nowrap')
    expect(mini.get('[data-slot="list"]').classes()).not.toContain('flex-wrap')
    const scroller = mini.element.parentElement!
    expect(scroller.classList.contains('overflow-x-auto')).toBe(true)
    const bar = scroller.parentElement!
    expect(bar.classList.contains('flex')).toBe(true)
    expect(bar.classList.contains('flex-wrap')).toBe(false)
    expect(bar.firstElementChild).toBe(scroller)
    expect(bar.lastElementChild?.textContent).toContain('1–20 / 105')
  })
})
