import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { h } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import type { CellContext, ColumnDef } from '@tanstack/vue-table'
import DataTable from '~/components/data-table/DataTable.vue'
import DataTableLazy from '~/components/data-table/DataTableLazy.vue'
import SettingsTable from '~/components/data-table/SettingsTable.vue'

const columns = [{ accessorKey: 'name', header: 'Name' }]

describe('DataTable native loading', () => {
  it('renders header progress plus one skeleton row per page slot on first load', async () => {
    const wrapper = await mountSuspended(DataTable, { props: {
      headerName: 'Records',
      data: [], columns, loading: true,
      paginationConfig: { itemsPerPage: 5, total: 100 },
    } })
    try {
      expect(wrapper.get('thead').classes()).toContain('after:bg-primary')
      expect(wrapper.findAll('tbody .eapp-table-skeleton-row')).toHaveLength(5)
      expect(wrapper.findAll('tbody tr .eapp-table-skeleton')).toHaveLength(5)
      expect(wrapper.findAll('tbody tr')).toHaveLength(6)
      expect(wrapper.get('tbody').classes()).toContain('eapp-table-skeleton-body')
      const fallback = wrapper.get('[data-slot="loading"]').element.parentElement
      expect(fallback?.querySelector('button, input, [tabindex]')).toBeNull()
      expect(wrapper.get('[data-slot="loading"] [hidden]').attributes('aria-hidden')).toBe('true')
      expect(wrapper.findAll('[role="status"]')).toHaveLength(1)
      for (const row of wrapper.findAll('.eapp-table-skeleton-row')) {
        expect(row.attributes('aria-hidden')).toBe('true')
        expect(row.attributes('inert')).toBeDefined()
        expect(row.attributes('tabindex')).toBeUndefined()
        expect(row.attributes('data-selectable')).toBeUndefined()
      }
      expect(wrapper.find('[aria-label="Loading table"]').exists()).toBe(false)
      expect(wrapper.text()).not.toContain('No data available')
      expect(wrapper.find('[role="status"]').exists()).toBe(true)
      await wrapper.setProps({ loading: false })
      expect(wrapper.get('thead').classes()).not.toContain('after:bg-primary')
      expect(wrapper.findAll('tbody tr')).toHaveLength(1)
      expect(wrapper.find('.eapp-table-skeleton').exists()).toBe(false)
      expect(wrapper.text()).toContain('No data available')
    } finally { wrapper.unmount() }
  })

  it('defaults the skeleton row count to ten without a pagination config', async () => {
    const wrapper = await mountSuspended(DataTable, { props: {
    headerName: 'Records', data: [], columns, loading: true } })
    try {
      expect(wrapper.findAll('tbody .eapp-table-skeleton-row')).toHaveLength(10)
      expect(wrapper.findAll('tbody tr .eapp-table-skeleton')).toHaveLength(10)
    } finally { wrapper.unmount() }
  })

  it('keeps one skeleton cell per column and an invisible action replica for exact row height', async () => {
    const wrapper = await mountSuspended(DataTable, { props: {
      headerName: 'Records',
      data: [], loading: true,
      columns: [...columns, { id: '__actions', header: '' }],
      paginationConfig: { itemsPerPage: 3, total: 30 },
    } })
    try {
      const rows = wrapper.findAll('tbody .eapp-table-skeleton-row')
      expect(rows).toHaveLength(3)
      for (const row of rows) {
        expect(row.findAll('td')).toHaveLength(2)
        expect(row.findAll('.eapp-table-skeleton')).toHaveLength(1)
        expect(row.find('td:last-child .invisible').exists()).toBe(true)
        expect(row.find('td:last-child .eapp-table-skeleton').exists()).toBe(false)
      }
    } finally { wrapper.unmount() }
  })

  it('keeps existing native rows mounted during refresh', async () => {
    const wrapper = await mountSuspended(DataTable, { props: {
    headerName: 'Records', data: [{ id: 1, name: 'Retained row' }], columns } })
    try {
      const row = wrapper.get('tbody tr').element
      await wrapper.setProps({ loading: true })
      expect(wrapper.get('tbody tr').element).toBe(row)
      expect(wrapper.get('thead').classes()).toContain('after:bg-primary')
      expect(wrapper.text()).toContain('Retained row')
      expect(wrapper.find('[data-slot="loading"]').exists()).toBe(false)
      expect(wrapper.find('.eapp-table-skeleton').exists()).toBe(false)
      await wrapper.setProps({ loading: false, data: [{ id: 1, name: 'Updated row' }] })
      expect(wrapper.text()).toContain('Updated row')
    } finally { wrapper.unmount() }
  })

  it('gives the lazy /data adapter the same native loading treatment', async () => {
    const wrapper = await mountSuspended(DataTableLazy, { props: {
    headerName: 'Records', data: [], columns, loading: true } })
    try {
      await flushPromises()
      expect(wrapper.get('thead').classes()).toContain('after:bg-primary')
      expect(wrapper.findAll('tbody .eapp-table-skeleton-row')).toHaveLength(10)
      expect(wrapper.findAll('tbody tr .eapp-table-skeleton')).toHaveLength(10)
      expect(wrapper.find('[aria-label="Loading table"]').exists()).toBe(false)
      expect(wrapper.text()).not.toContain('No data')
    } finally { wrapper.unmount() }
  })

  it('gives the settings adapter the same native loading treatment', async () => {
    const wrapper = await mountSuspended(SettingsTable, { props: {
    headerName: 'Records', data: [], columns, loading: true } })
    try {
      expect(wrapper.get('thead').classes()).toContain('after:bg-primary')
      expect(wrapper.findAll('tbody .eapp-table-skeleton-row')).toHaveLength(10)
      expect(wrapper.get('tbody .eapp-table-skeleton-row').findAll('td')).toHaveLength(2)
      expect(wrapper.find('[aria-label="Loading table"]').exists()).toBe(false)
      expect(wrapper.text()).not.toContain('No data')
    } finally { wrapper.unmount() }
  })

  it('shows native progress for settings pagination refreshes even without a visible footer', async () => {
    const wrapper = await mountSuspended(SettingsTable, { props: {
    headerName: 'Records', data: [{ id: 1, name: 'Retained row' }], columns, pageLimit: 20 } })
    try {
      const row = wrapper.get('tbody tr').element
      await wrapper.setProps({ paginationLoading: true })
      expect(wrapper.get('thead').classes()).toContain('after:bg-primary')
      expect(wrapper.get('tbody tr').element).toBe(row)
      expect(wrapper.find('.eapp-table-skeleton').exists()).toBe(false)
      expect(wrapper.find('[aria-label="Table pagination"]').exists()).toBe(false)
      await wrapper.setProps({ paginationLoading: false })
      expect(wrapper.get('thead').classes()).not.toContain('after:bg-primary')
    } finally { wrapper.unmount() }
  })

  it('suppresses caller cell slots so skeleton bars replace custom cell templates', async () => {
    const wrapper = await mountSuspended(DataTable<{ name: string }>, {
      props: {
      headerName: 'Records', data: [], loading: true, columns, paginationConfig: { itemsPerPage: 3, total: 30 } },
      slots: { 'name-cell': ({ row }: CellContext<{ name: string }, unknown>) => h('span', { class: 'custom-cell' }, row.original.name) },
    })
    try {
      expect(wrapper.findAll('tbody .eapp-table-skeleton-row')).toHaveLength(3)
      expect(wrapper.findAll('tbody tr .eapp-table-skeleton')).toHaveLength(3)
      expect(wrapper.find('.custom-cell').exists()).toBe(false)
      await wrapper.setProps({ loading: false, data: [{ name: 'Ready' }] })
      expect(wrapper.get('.custom-cell').text()).toBe('Ready')
    } finally { wrapper.unmount() }
  })

  it('keeps the native API, header callbacks, options and caller body slots truthful during first load', async () => {
    type RecordRow = { id: number; name: string; __eappSkeletonRow?: boolean }
    const accessor = vi.fn((row: RecordRow) => row.name)
    const cellClass = vi.fn(({ row }: CellContext<RecordRow, unknown>['cell']) => row.original.name)
    const rowId = vi.fn((row: RecordRow) => String(row.id))
    const eligible = vi.fn(({ original }: { original: RecordRow }) => original.id > 0)
    const onSelect = vi.fn()
    const onHover = vi.fn()
    const onContextmenu = vi.fn()
    const headerRowCounts: number[] = []
    const typedColumns: ColumnDef<RecordRow>[] = [{
      id: 'name', accessorFn: accessor,
      header: ({ table }) => { headerRowCounts.push(table.options.data.length); return 'Name' },
      meta: { class: { td: cellClass }, style: { td: 'color: red' } },
    }]
    const wrapper = await mountSuspended(DataTable<RecordRow>, {
      props: { headerName: 'Records', data: [], columns: typedColumns, loading: true, enableRowSelection: true, getRowId: rowId, rowSelectionOptions: { enableRowSelection: eligible }, onSelect, onHover, onContextmenu },
      slots: { 'body-top': () => h('tr', { class: 'custom-top' }, [h('td', 'Before')]), 'body-bottom': () => h('tr', { class: 'custom-bottom' }, [h('td', 'After')]) },
    })
    try {
      expect(headerRowCounts.length).toBeGreaterThan(0)
      expect(headerRowCounts.every(count => count === 0)).toBe(true)
      expect(wrapper.find('.custom-top').exists()).toBe(true)
      expect(wrapper.find('.custom-bottom').exists()).toBe(true)
      expect(wrapper.get('thead [role="checkbox"]').attributes('disabled')).toBeDefined()
      const placeholder = wrapper.get('.eapp-table-skeleton-row')
      await placeholder.trigger('click')
      await placeholder.trigger('contextmenu')
      await placeholder.trigger('pointerenter')
      await placeholder.trigger('keydown', { key: 'Enter' })
      for (const callback of [accessor, cellClass, rowId, eligible, onSelect, onHover, onContextmenu]) expect(callback).not.toHaveBeenCalled()
      expect(wrapper.emitted('row-click')).toBeUndefined()
      expect(wrapper.emitted('update:selectedRows')).toBeUndefined()
      const checkboxCell = placeholder.get('td:first-child')
      expect(checkboxCell.classes()).toContain('ps-3')
      expect(checkboxCell.get('[role="checkbox"]').classes()).toContain('max-lg:size-7')
      const nameCell = placeholder.get('td:nth-child(2)')
      expect(nameCell.classes()).toContain('px-3')
      expect(nameCell.classes()).toContain('md:p-4')
      expect(nameCell.attributes('style')).toContain('color: red')
      const real = { id: 8, name: 'Real row', __eappSkeletonRow: true }
      await wrapper.setProps({ loading: false, data: [real] })
      await wrapper.get('tbody tr[data-selectable="true"]').trigger('click')
      expect(wrapper.emitted('row-click')?.at(-1)?.[0]).toEqual(real)
      expect(cellClass).toHaveBeenCalled()
      expect(rowId.mock.calls.length).toBeGreaterThan(0)
      for (const [row] of rowId.mock.calls) expect(row).toEqual(real)
    } finally { wrapper.unmount() }
  })

  it('honors controlled column visibility and native cell geometry while skeletons are active', async () => {
    const wrapper = await mountSuspended(DataTable, { props: {
      headerName: 'Records', data: [], loading: true,
      columns: [{ accessorKey: 'name', header: 'Name', meta: { class: { td: 'custom-cell-class' }, style: { td: { minWidth: '84px' } } } }, { accessorKey: 'hidden', header: 'Hidden' }],
      columnVisibility: { hidden: false },
      paginationConfig: { itemsPerPage: 4, total: 12 },
      ui: { td: 'px-2 py-1' },
    } })
    try {
      expect(wrapper.findAll('thead th')).toHaveLength(1)
      for (const row of wrapper.findAll('.eapp-table-skeleton-row')) {
        expect(row.findAll('td')).toHaveLength(1)
        expect(row.get('td').classes()).toContain('custom-cell-class')
        expect(row.get('td').classes()).toContain('px-2')
        expect(row.get('td').attributes('style')).toContain('min-width: 84px')
      }
      await wrapper.setProps({ columnVisibility: {} })
      expect(wrapper.findAll('.eapp-table-skeleton-row')).toHaveLength(4)
      expect(wrapper.get('.eapp-table-skeleton-row').findAll('td')).toHaveLength(2)
    } finally { wrapper.unmount() }
  })

  it('preserves an explicitly supplied native loading slot instead of skeletons', async () => {
    const wrapper = await mountSuspended(DataTable, {
      props: {
      headerName: 'Records', data: [], columns, loading: true },
      slots: { loading: () => h('span', 'Custom loading') },
    })
    try {
      expect(wrapper.get('[data-slot="loading"]').text()).toBe('Custom loading')
      expect(wrapper.find('.eapp-table-skeleton').exists()).toBe(false)
      await wrapper.setProps({ data: [{ name: 'Ready' }] })
      expect(wrapper.find('[data-slot="loading"]').exists()).toBe(false)
      expect(wrapper.text()).toContain('Ready')
    } finally { wrapper.unmount() }
  })
})
