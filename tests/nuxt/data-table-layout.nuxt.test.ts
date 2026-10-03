import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'

import DataTable from '~/components/data-table/DataTable.vue'
import DataTableLazy from '~/components/data-table/DataTableLazy.vue'

describe('DataTable layout', () => {
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
    expect(source).toContain("slots.toolbar || slots['toolbar-actions'] || props.showColumnVisibility")
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
    expect(wrapper.text()).toContain('Columns')
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
    expect(wrapper.text()).toContain('Columns')
    expect(wrapper.findAll('thead th')).toHaveLength(1)
    expect(wrapper.get('thead').text()).toContain('ID')
    await wrapper.setProps({ showColumnVisibility: false })
    expect(wrapper.text()).not.toContain('Columns')
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
