import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import SettingsTable from '~/components/data-table/SettingsTable.vue'

const rows = [{ id: 1, name: 'System', isSystem: true }, { id: 2, name: 'Custom' }]
const baseProps = { headerName: 'Records', data: rows, columns: [{ accessorKey: 'name', header: 'Name' }] }

function action(overrides = {}) {
  return { label: 'Delete selected records', enabled: true, pending: false, execute: vi.fn().mockResolvedValue([2]), ...overrides }
}

describe('Settings table bulk selection', () => {
  it('does not infer destructive actions or selection from an API table name', async () => {
    const wrapper = await mountSuspended(SettingsTable, { props: { ...baseProps, tableName: 'enfyra_route' } as any })
    try {
      await flushPromises()
      expect(wrapper.find('tbody [role="checkbox"]').exists()).toBe(false)
      expect(wrapper.find('[aria-label="Delete selected records"]').exists()).toBe(false)
    } finally { wrapper.unmount() }
  })

  it('supports selection independently of a bulk mutation', async () => {
    const wrapper = await mountSuspended(SettingsTable, { props: { ...baseProps, enableRowSelection: true } as any })
    try {
      await flushPromises()
      await wrapper.get('tbody [aria-label="Select row 2"]').trigger('click')
      await flushPromises()
      expect(wrapper.emitted('update:selectedRows')?.at(-1)?.[0]).toEqual([rows[1]])
      expect(wrapper.find('[aria-label="Delete selected records"]').exists()).toBe(false)
    } finally { wrapper.unmount() }
  })

  it('uses caller eligibility for both row and select-all checkboxes', async () => {
    const bulkAction = action({ isEligible: (row: Record<string, any>) => !row.isSystem })
    const wrapper = await mountSuspended(SettingsTable, { props: { ...baseProps, bulkAction } as any })
    try {
      await flushPromises()
      expect(wrapper.get('tbody [aria-label="Select row 1"]').attributes('disabled')).toBeDefined()
      await wrapper.get('thead [role="checkbox"]').trigger('click')
      await flushPromises()
      expect(wrapper.text()).toContain('1 selected')
      await wrapper.get('[aria-label="Delete selected records"]').trigger('click')
      await flushPromises()
      expect(bulkAction.execute).toHaveBeenCalledWith([rows[1]])
      expect(wrapper.get('tbody [aria-label="Select row 2"]').attributes('aria-checked')).toBe('false')
    } finally { wrapper.unmount() }
  })

  it('does not expose an action when the caller denies it', async () => {
    const bulkAction = action({ enabled: false })
    const wrapper = await mountSuspended(SettingsTable, { props: { ...baseProps, bulkAction } as any })
    try {
      await flushPromises()
      expect(wrapper.find('tbody [role="checkbox"]').exists()).toBe(false)
      expect(bulkAction.execute).not.toHaveBeenCalled()
    } finally { wrapper.unmount() }
  })

  it('removes successful IDs while retaining failed selections', async () => {
    const bulkAction = action()
    const wrapper = await mountSuspended(SettingsTable, { props: { ...baseProps, bulkAction } as any })
    try {
      await flushPromises()
      await wrapper.get('thead [role="checkbox"]').trigger('click')
      await flushPromises()
      await wrapper.get('[aria-label="Delete selected records"]').trigger('click')
      await flushPromises()
      expect(wrapper.get('tbody [aria-label="Select row 1"]').attributes('aria-checked')).toBe('true')
      expect(wrapper.get('tbody [aria-label="Select row 2"]').attributes('aria-checked')).toBe('false')
      expect(wrapper.text()).toContain('1 selected')
    } finally { wrapper.unmount() }
  })

  it('keeps selection and the selected records consistent after same-ID refresh', async () => {
    const bulkAction = action()
    const wrapper = await mountSuspended(SettingsTable, { props: { ...baseProps, bulkAction } as any })
    try {
      await flushPromises()
      await wrapper.get('tbody [aria-label="Select row 2"]').trigger('click')
      await flushPromises()
      const refreshed = rows.map(row => ({ ...row, name: `${row.name} refreshed` }))
      await wrapper.setProps({ data: refreshed })
      await flushPromises()
      expect(wrapper.text()).toContain('1 selected')
      await wrapper.get('[aria-label="Delete selected records"]').trigger('click')
      await flushPromises()
      expect(bulkAction.execute).toHaveBeenCalledWith([refreshed[1]])
    } finally { wrapper.unmount() }
  })

  it('composes the caller summary and toolbar alongside bulk controls', async () => {
    const wrapper = await mountSuspended(SettingsTable, {
      props: { ...baseProps, bulkAction: action() } as any,
      slots: { 'pagination-summary': '<span>Caller summary</span>', 'toolbar-actions': '<button>Caller action</button>' },
    })
    try {
      await flushPromises()
      expect(wrapper.text()).toContain('Caller summary')
      await wrapper.get('tbody [aria-label="Select row 2"]').trigger('click')
      await flushPromises()
      expect(wrapper.text()).toContain('Caller summary')
      expect(wrapper.text()).toContain('1 selected')
      expect(wrapper.text()).toContain('Caller action')
    } finally { wrapper.unmount() }
  })
})
