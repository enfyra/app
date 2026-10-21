import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent, h, nextTick, ref, type Component } from 'vue'

import DataTable from '~/components/data-table/DataTable.vue'
import DataTableLazy from '~/components/data-table/DataTableLazy.vue'

describe('DataTable layout', () => {
  it('renders the heading with the record count beside it and the action cluster on the right', async () => {
    const wrapper = await mountSuspended(DataTable, {
      props: {
        headerName: 'Records',
        headerDescription: 'All records',
        data: [{ id: 1 }],
        columns: [{ accessorKey: 'id', header: 'ID' }],
        paginationConfig: { total: 64, itemsPerPage: 10 },
      },
      slots: { 'toolbar-actions': '<button>Refresh</button>' },
    })
    try {
      await flushPromises()
      const title = wrapper.get('.eapp-table-title')
      expect(title.text()).toBe('Records')
      const badge = wrapper.get('[aria-live="polite"]')
      expect(badge.text()).toBe('64 records')
      expect(title.element.parentElement!.contains(badge.element)).toBe(true)
      const headerTier = title.element.parentElement!.parentElement!.parentElement!
      expect(headerTier.textContent).toContain('All records')
      expect(headerTier.textContent).toContain('64 records')
      const columns = wrapper.get('[aria-label="Choose visible columns"]')
      const actionTier = columns.element.parentElement!.parentElement!
      expect(actionTier.classList.contains('md:w-auto')).toBe(true)
      const right = columns.element.parentElement!
      expect(right.firstElementChild?.textContent).toBe('Refresh')
      expect(right.lastElementChild).toBe(columns.element)
      expect(right.classList.contains('ml-auto')).toBe(true)
    } finally { wrapper.unmount() }
  })

  it('hides the record count in cursor pagination mode without a server total', async () => {
    const wrapper = await mountSuspended(DataTable, {
      props: {
        headerName: 'Records',
        data: [{ id: 1 }],
        columns: [{ accessorKey: 'id', header: 'ID' }],
        paginationConfig: { mode: 'cursor', itemsPerPage: 10, rowCount: 1, hasNextPage: true },
      },
    })
    try {
      await flushPromises()
      expect(wrapper.find('[aria-live="polite"]').exists()).toBe(false)
      expect(wrapper.text()).not.toContain('records')
      expect(wrapper.find('[aria-label="Next"]').exists()).toBe(true)
    } finally { wrapper.unmount() }
  })

  it('shows the total record count in cursor pagination mode when the server supplies one', async () => {
    const wrapper = await mountSuspended(DataTable, {
      props: {
        headerName: 'Records',
        data: [{ id: 1 }, { id: 2 }],
        columns: [{ accessorKey: 'id', header: 'ID' }],
        paginationConfig: { mode: 'cursor', itemsPerPage: 10, rowCount: 2, total: 128, hasNextPage: true },
      },
    })
    try {
      await flushPromises()
      expect(wrapper.get('[aria-live="polite"]').text()).toBe('128 records')
      expect(wrapper.find('[aria-label="Next"]').exists()).toBe(true)
    } finally { wrapper.unmount() }
  })

  it('falls back to the supplied rows when no server total exists', async () => {
    const wrapper = await mountSuspended(DataTable, {
      props: { headerName: 'Records', data: [{ id: 1 }, { id: 2 }], columns: [{ accessorKey: 'id', header: 'ID' }] },
    })
    try {
      await flushPromises()
      expect(wrapper.get('[aria-live="polite"]').text()).toBe('2 records')
      await wrapper.setProps({ data: [] })
      expect(wrapper.get('[aria-live="polite"]').text()).toBe('0 records')
    } finally { wrapper.unmount() }
  })

  it('forwards the heading through the lazy table without passing it to UTable', async () => {
    const wrapper = await mountSuspended(DataTableLazy, {
      props: { headerName: 'Lazy records', data: [{ id: 1 }, { id: 2 }], columns: [{ accessorKey: 'id', header: 'ID' }] },
    })
    try {
      await flushPromises()
      expect(wrapper.get('[aria-live="polite"]').text()).toBe('2 records')
      expect(wrapper.text()).toContain('Lazy records')
      expect(wrapper.get('table').attributes()).not.toHaveProperty('headername')
    } finally { wrapper.unmount() }
  })

  it.each([DataTable, DataTableLazy] as Component[])('owns search state and submission', async component => {
    const wrapper = await mountSuspended(component, {
      props: {
        headerName: 'Records',
        data: [{ id: 1 }], columns: [{ accessorKey: 'id', header: 'ID' }],
        searchable: true, search: 'initial', searchPlaceholder: 'Find a row', searchLabel: 'Find records',
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
      await wrapper.setProps({ searchable: false })
      expect(wrapper.find('form.eapp-search-field').exists()).toBe(false)
      expect(wrapper.get('.eapp-table-title').text()).toBe('Records')
      expect(wrapper.get('table').attributes()).not.toHaveProperty('searchable')
    } finally { wrapper.unmount() }
  })

  it('keeps the header row when only the heading is declared', async () => {
    const wrapper = await mountSuspended(DataTable, {
      props: { headerName: 'Files', data: [{ id: 1 }], columns: [{ accessorKey: 'id', header: 'ID' }], showColumnVisibility: false },
    })
    try {
      expect(wrapper.get('.eapp-table-title').text()).toBe('Files')
      expect(wrapper.get('[aria-live="polite"]').text()).toBe('1 records')
      expect(wrapper.find('[aria-label="Choose visible columns"]').exists()).toBe(false)
    } finally { wrapper.unmount() }
  })

  it('places search on its own row below the header row', async () => {
    const wrapper = await mountSuspended(DataTable, {
      props: { headerName: 'Dataset title', data: [{ id: 1 }], columns: [{ accessorKey: 'id', header: 'ID' }], searchable: true },
    })
    try {
      await flushPromises()
      const title = wrapper.get('.eapp-table-title').element
      const search = wrapper.get('form.eapp-search-field').element
      const toolbar = title.closest('.bg-muted')!
      expect(toolbar.children).toHaveLength(2)
      expect(toolbar.children[0]?.contains(title)).toBe(true)
      expect(toolbar.children[1]?.contains(search)).toBe(true)
      expect(toolbar.children[1]?.classList.contains('border-t')).toBe(true)
      expect(toolbar.children[0]?.contains(search)).toBe(false)
    } finally { wrapper.unmount() }
  })

  it('keeps the same frame whether or not the table sits in a panel', async () => {
    const standalone = await mountSuspended(DataTable, {
      props: {
    headerName: 'Records', data: [{ id: 1 }], columns: [{ accessorKey: 'id', header: 'ID' }] },
    })
    try {
      const root = standalone.get('.eapp-data-table')
      expect(root.classes()).toContain('border')
      expect(root.classes()).toContain('rounded-[var(--radius-card)]')
    } finally { standalone.unmount() }
  })

  it('uses Nuxt UI table layout and keeps identifier columns compact', async () => {
    const wrapper = await mountSuspended(DataTable, {
      route: '/data/cloud_email_senders',
      props: {
        headerName: 'Records',
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
        props: {
      headerName: 'Records', data: [{ id: 1, name: 'Phone row' }], columns: [{ accessorKey: 'name', header: 'Name' }] },
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
    expect(source).toContain("const hasActionTier = () => !!slots.toolbar || !!slots['toolbar-actions'] || (props.showColumnVisibility && visibilityItems.value.length > 0) || !!props.reload")
    expect(source).toContain('props.showColumnVisibility && visibilityItems.length')
  })

  it('shows Columns on the lazy Data table used by /data', async () => {
    const wrapper = await mountSuspended(DataTableLazy, {
      route: '/data/cloud_email_senders',
      props: {
        headerName: 'Records',
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
        headerName: 'Records',
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
        headerName: 'Records',
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
        headerName: 'Records',
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
          headerName: 'Records',
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
          headerName: 'Records',
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
        headerName: 'Records',
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

  it('retains internal selection through the lazy wrapper after its parent uses the emitted list', async () => {
    const Host = defineComponent({
      setup() {
        const selected = ref<Record<string, any>[]>([])
        const rows = ref([{ id: 2, name: 'First' }, { id: 1, name: 'Second' }])
        return () => h('section', [
          h('output', `${selected.value.length} selected`),
          h(DataTableLazy, {
            headerName: 'Records',
            data: rows.value,
            columns: [{ accessorKey: 'name', header: 'Name' }],
            getRowId: (row: Record<string, any>) => String(row.id),
            enableRowSelection: true,
            'onUpdate:selectedRows': (value: Record<string, any>[]) => { selected.value = value },
          }),
        ])
      },
    })
    const wrapper = await mountSuspended(Host)
    try {
      await flushPromises()
      const rowCheckbox = () => wrapper.get('tbody [aria-label="Select row 1"]')
      await rowCheckbox().trigger('click')
      await flushPromises()
      expect(rowCheckbox().attributes('data-state')).toBe('checked')
      expect(wrapper.get('output').text()).toBe('1 selected')
      await rowCheckbox().trigger('click')
      await flushPromises()
      expect(rowCheckbox().attributes('data-state')).toBe('unchecked')
      expect(wrapper.get('output').text()).toBe('0 selected')
    } finally { wrapper.unmount() }
  })

  it('adds the selection column itself when row selection is enabled and emits the selected rows', async () => {
    const wrapper = await mountSuspended(DataTable, {
      props: {
        headerName: 'Records',
        data: [{ id: 2, name: 'First' }, { id: 1, name: 'Second' }],
        columns: [{ accessorKey: 'name', header: 'Name' }],
        getRowId: (row: Record<string, any>) => String(row.id),
        enableRowSelection: true,
      },
    })
    try {
      await flushPromises()
      const boxes = wrapper.findAll('[role="checkbox"]')
      expect(boxes).toHaveLength(3)
      for (const box of boxes) expect(box.attributes('disabled')).toBeUndefined()
      await boxes[2]!.trigger('click')
      await nextTick()
      expect(wrapper.emitted('update:selectedRowIds')?.at(-1)?.[0]).toEqual(['1'])
      expect(wrapper.emitted('update:selectedRows')?.at(-1)?.[0]).toEqual([{ id: 1, name: 'Second' }])
    } finally { wrapper.unmount() }
  })

  it('uses logical ids without a caller-built row identity and retains controlled ids across pages', async () => {
    const selected = ref<(string | number)[]>([40])
    const rows = ref([{ id: 2, name: 'First' }])
    let selectionEvents = 0
    const Host = defineComponent({
      setup() {
        return () => h(DataTableLazy, {
          headerName: 'Records',
          data: rows.value,
          columns: [{ accessorKey: 'name', header: 'Name' }],
          enableRowSelection: true,
          selectedRowIds: selected.value,
          'onUpdate:selectedRowIds': (ids: (string | number)[]) => {
            selectionEvents += 1
            selected.value = ids
          },
        })
      },
    })
    const wrapper = await mountSuspended(Host)
    try {
      await flushPromises()
      await wrapper.get('tbody [role="checkbox"]').trigger('click')
      await flushPromises()
      expect(new Set(selected.value)).toEqual(new Set([40, 2]))
      expect(wrapper.get('tbody [role="checkbox"]').attributes('data-state')).toBe('checked')
      rows.value = [{ id: 40, name: 'Another page' }]
      await flushPromises()
      expect(wrapper.get('tbody [role="checkbox"]').attributes('data-state')).toBe('checked')
      expect(new Set(selected.value)).toEqual(new Set([40, 2]))
      expect(selectionEvents).toBeLessThan(5)
    } finally { wrapper.unmount() }
  })

  it('applies an external selected row id list to the checkbox state', async () => {
    const wrapper = await mountSuspended(DataTable, {
      props: {
        headerName: 'Records',
        data: [{ id: 2, name: 'First' }, { id: 1, name: 'Second' }],
        columns: [{ accessorKey: 'name', header: 'Name' }],
        getRowId: (row: Record<string, any>) => String(row.id),
        enableRowSelection: true,
        selectedRowIds: [1],
      },
    })
    try {
      await flushPromises()
      await nextTick()
      const states = wrapper.findAll('[role="checkbox"]').map((checkbox) => checkbox.attributes('data-state'))
      expect(states).toEqual(['indeterminate', 'unchecked', 'checked'])
    } finally { wrapper.unmount() }
  })

  it('owns opt-in row-click selection and blocks disabled selection', async () => {
    const wrapper = await mountSuspended(DataTable, {
      props: {
        headerName: 'Records',
        data: [{ id: 2, name: 'First' }],
        columns: [{ accessorKey: 'name', header: 'Name' }],
        enableRowSelection: true,
        selectOnRowClick: true,
        selectionDisabled: true,
      },
    })
    try {
      await flushPromises()
      expect(wrapper.get('tbody [role="checkbox"]').attributes('disabled')).toBeDefined()
      await wrapper.get('tbody tr').trigger('click')
      await flushPromises()
      expect(wrapper.get('tbody [role="checkbox"]').attributes('data-state')).toBe('unchecked')
      await wrapper.setProps({ selectionDisabled: false })
      await wrapper.get('tbody tr').trigger('click')
      await flushPromises()
      expect(wrapper.get('tbody [role="checkbox"]').attributes('data-state')).toBe('checked')
      expect(wrapper.emitted('update:selectedRowIds')?.at(-1)?.[0]).toEqual([2])
    } finally { wrapper.unmount() }
  })

  it('keeps a single-selection table to one checked row', async () => {
    const wrapper = await mountSuspended(DataTable, {
      props: {
        headerName: 'Records',
        data: [{ id: 2, name: 'First' }, { id: 1, name: 'Second' }],
        columns: [{ accessorKey: 'name', header: 'Name' }],
        getRowId: (row: Record<string, any>) => String(row.id),
        enableRowSelection: true,
        rowSelectionMode: 'single',
      },
    })
    try {
      await flushPromises()
      expect(wrapper.findAll('[role="checkbox"]')).toHaveLength(2)
      await wrapper.findAll('[role="checkbox"]')[0]!.trigger('click')
      await nextTick()
      await wrapper.findAll('[role="checkbox"]')[1]!.trigger('click')
      await nextTick()
      expect(wrapper.emitted('update:selectedRowIds')?.at(-1)?.[0]).toEqual(['1'])
    } finally { wrapper.unmount() }
  })
})
