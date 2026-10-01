import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { h } from 'vue'
import { describe, expect, it } from 'vitest'
import DataTable from '~/components/data-table/DataTable.vue'
import DataTableLazy from '~/components/data-table/DataTableLazy.vue'
import SettingsTable from '~/components/data-table/SettingsTable.vue'

const columns = [{ accessorKey: 'name', header: 'Name' }]

describe('DataTable native loading', () => {
  it('uses the native header progress without row skeletons or premature empty feedback', async () => {
    const wrapper = await mountSuspended(DataTable, { props: {
      data: [], columns, loading: true,
      paginationConfig: { itemsPerPage: 10, total: 100 },
    } })
    try {
      expect(wrapper.get('thead').classes()).toContain('after:bg-primary')
      expect(wrapper.find('[aria-label="Loading table"]').exists()).toBe(false)
      expect(wrapper.find('[data-slot="skeleton"]').exists()).toBe(false)
      expect(wrapper.text()).not.toContain('No data available')
      expect(wrapper.text()).not.toContain('No data')
      await wrapper.setProps({ paginationConfig: { itemsPerPage: 100, total: 100 } })
      expect(wrapper.findAll('tbody tr')).toHaveLength(1)
      await wrapper.setProps({ loading: false })
      expect(wrapper.get('thead').classes()).not.toContain('after:bg-primary')
      expect(wrapper.text()).toContain('No data available')
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
      await wrapper.setProps({ loading: false, data: [{ id: 1, name: 'Updated row' }] })
      expect(wrapper.text()).toContain('Updated row')
    } finally { wrapper.unmount() }
  })

  it('gives the lazy /data adapter the same native loading treatment', async () => {
    const wrapper = await mountSuspended(DataTableLazy, { props: { data: [], columns, loading: true } })
    try {
      await flushPromises()
      expect(wrapper.get('thead').classes()).toContain('after:bg-primary')
      expect(wrapper.find('[aria-label="Loading table"]').exists()).toBe(false)
      expect(wrapper.text()).not.toContain('No data')
    } finally { wrapper.unmount() }
  })

  it('gives the settings adapter the same native loading treatment', async () => {
    const wrapper = await mountSuspended(SettingsTable, { props: { data: [], columns, loading: true } })
    try {
      expect(wrapper.get('thead').classes()).toContain('after:bg-primary')
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
      expect(wrapper.find('[aria-label="Table pagination"]').exists()).toBe(false)
      await wrapper.setProps({ paginationLoading: false })
      expect(wrapper.get('thead').classes()).not.toContain('after:bg-primary')
    } finally { wrapper.unmount() }
  })

  it('preserves an explicitly supplied native loading slot', async () => {
    const wrapper = await mountSuspended(DataTable, {
      props: { data: [], columns, loading: true },
      slots: { loading: () => h('span', 'Custom loading') },
    })
    try {
      expect(wrapper.get('[data-slot="loading"]').text()).toBe('Custom loading')
      await wrapper.setProps({ data: [{ name: 'Ready' }] })
      expect(wrapper.find('[data-slot="loading"]').exists()).toBe(false)
      expect(wrapper.text()).toContain('Ready')
    } finally { wrapper.unmount() }
  })
})
