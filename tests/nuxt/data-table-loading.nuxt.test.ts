import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { h } from 'vue'
import { describe, expect, it } from 'vitest'
import DataTable from '~/components/data-table/DataTable.vue'
import DataTableLazy from '~/components/data-table/DataTableLazy.vue'
import SettingsTable from '~/components/data-table/SettingsTable.vue'

const columns = [{ accessorKey: 'name', header: 'Name' }]

describe('DataTable native loading', () => {
  it('renders header progress plus one skeleton row per page slot on first load', async () => {
    const wrapper = await mountSuspended(DataTable, { props: {
      data: [], columns, loading: true,
      paginationConfig: { itemsPerPage: 5, total: 100 },
    } })
    try {
      expect(wrapper.get('thead').classes()).toContain('after:bg-primary')
      expect(wrapper.findAll('tbody tr')).toHaveLength(5)
      expect(wrapper.findAll('tbody tr .eapp-table-skeleton')).toHaveLength(5)
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
    const wrapper = await mountSuspended(DataTable, { props: { data: [], columns, loading: true } })
    try {
      expect(wrapper.findAll('tbody tr')).toHaveLength(10)
      expect(wrapper.findAll('tbody tr .eapp-table-skeleton')).toHaveLength(10)
    } finally { wrapper.unmount() }
  })

  it('keeps one skeleton cell per column and an invisible action replica for exact row height', async () => {
    const wrapper = await mountSuspended(DataTable, { props: {
      data: [], loading: true,
      columns: [...columns, { id: '__actions', header: '' }],
      paginationConfig: { itemsPerPage: 3, total: 30 },
    } })
    try {
      const rows = wrapper.findAll('tbody tr')
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
    const wrapper = await mountSuspended(DataTable, { props: { data: [{ id: 1, name: 'Retained row' }], columns } })
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
    const wrapper = await mountSuspended(DataTableLazy, { props: { data: [], columns, loading: true } })
    try {
      await flushPromises()
      expect(wrapper.get('thead').classes()).toContain('after:bg-primary')
      expect(wrapper.findAll('tbody tr')).toHaveLength(10)
      expect(wrapper.findAll('tbody tr .eapp-table-skeleton')).toHaveLength(10)
      expect(wrapper.find('[aria-label="Loading table"]').exists()).toBe(false)
      expect(wrapper.text()).not.toContain('No data')
    } finally { wrapper.unmount() }
  })

  it('gives the settings adapter the same native loading treatment', async () => {
    const wrapper = await mountSuspended(SettingsTable, { props: { data: [], columns, loading: true } })
    try {
      expect(wrapper.get('thead').classes()).toContain('after:bg-primary')
      expect(wrapper.findAll('tbody tr')).toHaveLength(10)
      expect(wrapper.get('tbody tr').findAll('td')).toHaveLength(2)
      expect(wrapper.find('[aria-label="Loading table"]').exists()).toBe(false)
      expect(wrapper.text()).not.toContain('No data')
    } finally { wrapper.unmount() }
  })

  it('shows native progress for settings pagination refreshes even without a visible footer', async () => {
    const wrapper = await mountSuspended(SettingsTable, { props: { data: [{ id: 1, name: 'Retained row' }], columns, pageLimit: 20 } })
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
    const wrapper = await mountSuspended(DataTable, {
      props: { data: [], loading: true, columns, paginationConfig: { itemsPerPage: 3, total: 30 } },
      slots: { 'name-cell': ({ row }: any) => h('span', { class: 'custom-cell' }, row.original.name) },
    })
    try {
      expect(wrapper.findAll('tbody tr')).toHaveLength(3)
      expect(wrapper.findAll('tbody tr .eapp-table-skeleton')).toHaveLength(3)
      expect(wrapper.find('.custom-cell').exists()).toBe(false)
      await wrapper.setProps({ loading: false, data: [{ name: 'Ready' }] })
      expect(wrapper.get('.custom-cell').text()).toBe('Ready')
    } finally { wrapper.unmount() }
  })

  it('preserves an explicitly supplied native loading slot instead of skeletons', async () => {
    const wrapper = await mountSuspended(DataTable, {
      props: { data: [], columns, loading: true },
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
