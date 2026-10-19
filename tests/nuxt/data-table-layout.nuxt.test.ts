import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent, h, nextTick, ref, type Component } from 'vue'

import DataTable from '~/components/data-table/DataTable.vue'
import DataTableLazy from '~/components/data-table/DataTableLazy.vue'

describe('DataTable layout', () => {
  it('orders the optional heading, search and count on the left with Columns last on the right', async () => {
    const wrapper = await mountSuspended(DataTable, {
      props: { data: [{ id: 1 }], columns: [{ accessorKey: 'id', header: 'ID' }], headerName: 'Records', recordCount: 64, showRecordCount: true },
      slots: { toolbar: '<input aria-label="Search records" />', 'toolbar-actions': '<button>Refresh</button>' },
    })
    try {
      await flushPromises()
      const badge = wrapper.get('[aria-live="polite"]')
      expect(badge.text()).toBe('64 records')
      const actionTier = badge.element.parentElement!
      const toolbar = actionTier.parentElement!
      expect(toolbar.firstElementChild?.textContent).toBe('Records')
      expect(toolbar.firstElementChild?.querySelector('input')?.getAttribute('aria-label')).toBe('Search records')
      expect(actionTier.firstElementChild).toBe(badge.element)
      const columns = wrapper.get('[aria-label="Choose visible columns"]')
      const right = columns.element.parentElement!
      expect(right.firstElementChild?.textContent).toBe('Refresh')
      expect(right.lastElementChild).toBe(columns.element)
      await wrapper.setProps({ showRecordCount: false, headerName: undefined })
      expect(wrapper.find('[aria-live="polite"]').exists()).toBe(false)
      expect(wrapper.find('input').exists()).toBe(true)
      expect(right.lastElementChild).toBe(columns.element)
      await wrapper.setProps({ showRecordCount: true, recordCount: 0 })
      expect(wrapper.get('[aria-live="polite"]').text()).toBe('0 records')
    } finally { wrapper.unmount() }
  })

  it('forwards count and heading props through the lazy table without passing them to UTable', async () => {
    const wrapper = await mountSuspended(DataTableLazy, {
      props: { data: [{ id: 1 }, { id: 2 }], columns: [{ accessorKey: 'id', header: 'ID' }], headerName: 'Lazy records', showRecordCount: true },
    })
    try {
      await flushPromises()
      expect(wrapper.get('[aria-live="polite"]').text()).toBe('2 records')
      expect(wrapper.text()).toContain('Lazy records')
      expect(wrapper.get('table').attributes()).not.toHaveProperty('showrecordcount')
      expect(wrapper.get('table').attributes()).not.toHaveProperty('headername')
    } finally { wrapper.unmount() }
  })

  it.each([DataTable, DataTableLazy] as Component[])('owns search state and submission without hiding an explicit heading', async component => {
    const wrapper = await mountSuspended(component, {
      props: {
        data: [{ id: 1 }], columns: [{ accessorKey: 'id', header: 'ID' }],
        searchable: true, search: 'initial', searchPlaceholder: 'Find a row', searchLabel: 'Find records',
        headerName: 'Records', showRecordCount: true,
      },
    })
    try {
      await flushPromises()
      const input = wrapper.get('input[aria-label="Find records"]')
      expect((input.element as HTMLInputElement).value).toBe('initial')
      expect(input.attributes('placeholder')).toBe('Find a row')
      expect(wrapper.get('.eapp-table-title').text()).toBe('Records')
      await input.setValue('updated')
      await wrapper.get('form.eapp-search-field').trigger('submit')
      expect(wrapper.emitted('update:search')?.at(-1)).toEqual(['updated'])
      expect(wrapper.emitted('search')?.at(-1)).toEqual(['updated'])
      await wrapper.setProps({ headerName: undefined })
      expect(wrapper.find('.eapp-table-title').exists()).toBe(false)
      expect(wrapper.find('form.eapp-search-field').exists()).toBe(true)
      await wrapper.setProps({ searchable: false, headerName: 'Restored title' })
      expect(wrapper.find('form.eapp-search-field').exists()).toBe(false)
      expect(wrapper.get('.eapp-table-title').text()).toBe('Restored title')
      expect(wrapper.get('table').attributes()).not.toHaveProperty('searchable')
    } finally { wrapper.unmount() }
  })

  it.each([DataTable, DataTableLazy] as Component[])('renders only the occupied toolbar tier when Columns is the only control', async component => {
    const wrapper = await mountSuspended(component, {
      props: { data: [{ id: 1 }], columns: [{ accessorKey: 'id', header: 'ID' }] },
    })
    try {
      await flushPromises()
      const toolbar = wrapper.get('[aria-label="Choose visible columns"]').element.closest('.bg-muted')!
      expect(toolbar.children).toHaveLength(1)
      expect(toolbar.firstElementChild?.querySelector('[aria-label="Choose visible columns"]')).not.toBeNull()
      expect(toolbar.classList.contains('py-3')).toBe(true)
      await wrapper.setProps({ headerName: 'Files' })
      expect(toolbar.children).toHaveLength(3)
      expect(toolbar.children[1]?.getAttribute('aria-hidden')).toBe('true')
      await wrapper.setProps({ headerName: undefined, showColumnVisibility: false })
      expect(wrapper.find('.bg-muted').exists()).toBe(false)
    } finally { wrapper.unmount() }
  })

  it('does not reserve an action tier for a title-only toolbar', async () => {
    const wrapper = await mountSuspended(DataTable, {
      props: { data: [{ id: 1 }], columns: [{ accessorKey: 'id', header: 'ID' }], headerName: 'Files', showColumnVisibility: false },
    })
    try {
      const toolbar = wrapper.get('.eapp-table-title').element.parentElement!.parentElement!
      expect(toolbar.children).toHaveLength(1)
      expect(toolbar.firstElementChild?.textContent).toBe('Files')
    } finally { wrapper.unmount() }
  })

  it('uses Nuxt UI table layout and keeps identifier columns compact', async () => {
    const wrapper = await mountSuspended(DataTable, {
      route: '/data/cloud_email_senders',
      props: {
        data: [
          { id: 2, email: 'no-reply@enfyra.io', name: 'Enfyra Cloud' },
          { id: 1, email: 'support@enfyra.io', name: 'Enfyra Support' },
        ],
        columns: [
          { id: 'id', accessorKey: 'id', header: 'id', size: 84, minSize: 84, maxSize: 220 },
          { id: 'email', accessorKey: 'email', header: 'email' },
          { id: 'name', accessorKey: 'name', header: 'name' },
        ],
      },
    })

    await nextTick()
    await flushPromises()
    await nextTick()

    const table = wrapper.get('table[data-slot="base"]')
    expect(table.classes()).toContain('min-w-max')
    expect(wrapper.get('thead th:first-child').attributes('style')).toContain('width: 84px')
    const idCell = wrapper.get('tbody tr:first-child td:first-child')
    expect(idCell.attributes('style')).toContain('max-width: 220px')
    expect(idCell.classes()).toContain('font-mono')
    expect(idCell.classes()).toContain('text-ellipsis')
    expect(wrapper.get('[data-slot="root"]').classes()).toContain('eapp-table-scroll')
  })

  it('keeps one native scrollable table at phone width without a card fallback', async () => {
    const originalWidth = window.innerWidth
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 })
    window.dispatchEvent(new Event('resize'))
    try {
      const wrapper = await mountSuspended(DataTable, {
        props: { data: [{ id: 1, name: 'Phone row' }], columns: [{ accessorKey: 'name', header: 'Name' }] },
      })
      expect(wrapper.findAll('table')).toHaveLength(1)
      expect(wrapper.findAll('tbody tr')).toHaveLength(1)
      expect(wrapper.get('.eapp-table-scroll').classes()).toContain('overflow-x-auto')
      expect(wrapper.find('dl').exists()).toBe(false)
      expect(wrapper.find('.surface-card').exists()).toBe(false)
      wrapper.unmount()
    } finally {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalWidth })
      window.dispatchEvent(new Event('resize'))
    }
  })

  it('reads the declared visibility prop in its template', async () => {
    const { readFileSync } = await import('node:fs')
    const { resolve } = await import('node:path')
    const source = readFileSync(resolve(process.cwd(), 'app/components/data-table/DataTable.vue'), 'utf8')
    expect(source).toContain("slots.toolbar || slots['toolbar-actions'] || (props.showColumnVisibility && visibilityItems.length)")
    expect(source).toContain('props.showColumnVisibility && visibilityItems.length')
  })

  it('shows Columns on the lazy Data table used by /data', async () => {
    const wrapper = await mountSuspended(DataTableLazy, {
      route: '/data/cloud_email_senders',
      props: {
        data: [{ id: 1, name: 'First' }],
        columns: [
          { accessorKey: 'id', header: 'ID', enableHiding: false },
          { accessorKey: 'name', header: 'Name' },
        ],
      },
    })
    await flushPromises()
    await nextTick()
    expect(wrapper.find('[aria-label="Choose visible columns"]').exists()).toBe(true)
  })

  it('shows native hideable columns by default and honors a controlled visibility state', async () => {
    const wrapper = await mountSuspended(DataTable, {
      props: {
        data: [{ id: 1, name: 'First' }],
        columns: [
          { accessorKey: 'id', header: 'ID', enableHiding: false },
          { accessorKey: 'name', header: 'Name' },
        ],
        columnVisibility: { name: false },
      },
    })
    await flushPromises()
    expect(wrapper.find('[aria-label="Choose visible columns"]').exists()).toBe(true)
    expect(wrapper.findAll('thead th')).toHaveLength(1)
    expect(wrapper.get('thead').text()).toContain('ID')
    await wrapper.setProps({ showColumnVisibility: false })
    expect(wrapper.find('[aria-label="Choose visible columns"]').exists()).toBe(false)
  })

  it('uses UTable row selection with a visible large checkbox column', async () => {
    const { createSelectionColumn } = await import('~/utils/data-table-selection')
    const wrapper = await mountSuspended(DataTable, {
      props: {
        data: [{ id: 2, name: 'First' }, { id: 1, name: 'Second' }],
        columns: [createSelectionColumn<Record<string, any>>(), { accessorKey: 'name', header: 'Name' }],
        getRowId: (row: Record<string, any>) => String(row.id),
      },
    })

    await flushPromises()
    const checkboxes = wrapper.findAll('[role="checkbox"]')
    expect(checkboxes).toHaveLength(3)
    expect(checkboxes[1]?.classes()).toContain('size-4.5')
    await checkboxes[1]!.trigger('click')
    await nextTick()
    expect(wrapper.get('tbody tr:first-child').attributes('data-selected')).toBe('true')
  })

  it('keeps the mobile selection gutter compact without shrinking checkbox touch targets', async () => {
    const { createSelectionColumn } = await import('~/utils/data-table-selection')
    const wrapper = await mountSuspended(DataTable, {
      props: {
        data: [{ id: 1 }],
        columns: [createSelectionColumn<Record<string, any>>(), { accessorKey: 'id', header: 'id' }],
      },
    })
    try {
      for (const cell of [wrapper.get('thead th:first-child'), wrapper.get('tbody td:first-child')]) {
        expect(cell.classes()).toContain('w-px')
        expect(cell.classes()).toContain('ps-3')
        expect(cell.classes()).toContain('pe-1')
        expect(cell.classes()).toContain('md:w-12')
        expect(cell.classes()).toContain('md:px-4')
        expect(cell.classes()).not.toContain('pointer-coarse:w-16')
      }
      for (const checkbox of wrapper.findAll('[role="checkbox"]')) {
        expect(checkbox.classes()).toContain('max-lg:size-7')
        expect(checkbox.classes()).toContain('pointer-coarse:before:-inset-2')
      }
      expect(wrapper.get('tbody td:nth-child(2)').classes()).toContain('px-3')
    } finally { wrapper.unmount() }
  })

  it('updates a controlled selection model when a checkbox is clicked', async () => {
    const { createSelectionColumn } = await import('~/utils/data-table-selection')
    const Host = defineComponent({
      setup() {
        const selection = ref<Record<string, boolean>>({})
        return () => h(DataTableLazy, {
          data: [{ id: 2, name: 'First' }],
          columns: [createSelectionColumn<Record<string, any>>(), { accessorKey: 'name', header: 'Name' }],
          getRowId: (row: Record<string, any>) => String(row.id),
          rowSelection: selection.value,
          'onUpdate:rowSelection': (value: Record<string, boolean>) => { selection.value = value },
        })
      },
    })
    const wrapper = await mountSuspended(Host)
    await flushPromises()
    await wrapper.get('tbody [role="checkbox"]').trigger('click')
    await nextTick()
    expect(wrapper.get('tbody tr').attributes('data-selected')).toBe('true')
  })

  it('keeps header and row checkbox states aligned with a controlled UTable model', async () => {
    const { createSelectionColumn } = await import('~/utils/data-table-selection')
    const Host = defineComponent({
      setup() {
        const selection = ref<Record<string, boolean>>({})
        return () => h(DataTableLazy, {
          data: [{ id: 2, name: 'First' }, { id: 1, name: 'Second' }],
          columns: [createSelectionColumn<Record<string, any>>(), { accessorKey: 'name', header: 'Name' }],
          getRowId: (row: Record<string, any>) => String(row.id),
          rowSelection: selection.value,
          'onUpdate:rowSelection': (value: Record<string, boolean>) => { selection.value = value },
        })
      },
    })
    const wrapper = await mountSuspended(Host)
    await flushPromises()
    const state = () => wrapper.findAll('[role="checkbox"]').map((checkbox) => checkbox.attributes('data-state'))
    expect(state()).toEqual(['unchecked', 'unchecked', 'unchecked'])
    await wrapper.findAll('[role="checkbox"]')[1]!.trigger('click')
    await nextTick()
    expect(state()).toEqual(['indeterminate', 'checked', 'unchecked'])
    await wrapper.findAll('[role="checkbox"]')[0]!.trigger('click')
    await nextTick()
    expect(state()).toEqual(['checked', 'checked', 'checked'])
    await wrapper.findAll('[role="checkbox"]')[2]!.trigger('click')
    await nextTick()
    expect(state()).toEqual(['indeterminate', 'checked', 'unchecked'])
  })

  it('forwards the native selection model through the lazy wrapper without paginating server rows', async () => {
    const { createSelectionColumn } = await import('~/utils/data-table-selection')
    const wrapper = await mountSuspended(DataTableLazy, {
      props: {
        data: Array.from({ length: 15 }, (_, index) => ({ id: index + 1, name: `Row ${index + 1}` })),
        columns: [createSelectionColumn<Record<string, any>>(), { accessorKey: 'name', header: 'Name' }],
        getRowId: (row: Record<string, any>) => String(row.id),
      },
    })

    await flushPromises()
    await nextTick()
    expect(wrapper.findAll('tbody tr')).toHaveLength(15)
    await wrapper.findAll('[role="checkbox"]')[1]!.trigger('click')
    await nextTick()
    expect(wrapper.emitted('update:rowSelection')?.at(-1)?.[0]).toEqual({ '1': true })
  })
})
