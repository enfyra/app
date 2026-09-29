import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import SettingsTable from '~/components/data-table/SettingsTable.vue'

describe('Settings table', () => {
  it('renders server-provided rows and an action menu without missing render bindings', async () => {
    const wrapper = await mountSuspended(SettingsTable, {
      props: {
        data: [{ id: 1, name: 'First', isEnabled: true }],
        columns: [{ accessorKey: 'name', header: 'Name' }],
        actions: () => [{ label: 'Disable', icon: 'lucide:power', onSelect: () => {} }],
        pageLimit: 10,
        total: 24,
        pageSizeKey: 'users',
        compact: true,
      },
    })
    await flushPromises()
    await nextTick()
    expect(wrapper.get('thead').text()).toContain('ID')
    expect(wrapper.get('tbody').text()).toContain('1')
    expect(wrapper.get('tbody').text()).toContain('First')
    expect(wrapper.get('tbody button')).toBeTruthy()
    expect(wrapper.get('tbody td').classes()).toContain('py-2')
    expect(wrapper.get('table[data-slot="base"]').classes()).toContain('table-fixed')
    expect(wrapper.get('table[data-slot="base"]').classes()).toContain('!min-w-[640px]')
    const footer = wrapper.get('.border-t.border-default.px-4.py-3')
    expect(footer.text()).toContain('Rows per page')
    expect(footer.text()).toContain('1–10 / 24')
    expect(footer.find('nav[data-slot="root"]').exists()).toBe(true)
    expect(wrapper.get('.eapp-settings-pagination').classes()).toContain('grid')
    expect(wrapper.get('.eapp-settings-pagination').classes()).toContain('sm:flex')
    expect(wrapper.get('.eapp-settings-pagination nav[data-slot="root"]').classes()).toContain('justify-self-end')
    expect(wrapper.get('.eapp-settings-pagination nav[data-slot="root"]').classes()).toContain('border-t')
    expect(wrapper.find('[aria-label="Choose visible columns"]').exists()).toBe(false)
    expect(document.body.querySelector('.eapp-pagination-mini')).not.toBeNull()
    expect((document.body.querySelector('.eapp-pagination-mini') as HTMLElement).style.display).toBe('none')
    expect(wrapper.find('[class*=eapp-page-constrained-wide]').exists()).toBe(true)
  })

  it('reserves short ID and control widths so route content gets the remaining space', async () => {
    const wrapper = await mountSuspended(SettingsTable, {
      props: {
        data: [{ id: 1376, path: '/long-route', mainTable: { name: 'long_table' }, isEnabled: true }],
        columns: [
          { accessorKey: 'path', header: 'Route' },
          { id: 'table', header: 'Table', cell: ({ row }) => row.original.mainTable.name },
          { id: 'methods', header: 'Methods' },
          { id: 'publicMethods', header: 'Public' },
          { accessorKey: 'isEnabled', header: 'Status' },
        ],
        actions: () => [{ label: 'Delete', icon: 'lucide:trash-2', onSelect: () => {} }],
      },
    })
    await flushPromises()
    const headers = wrapper.findAll('thead th')
    const idWidth = Number.parseInt((headers[0]!.element as HTMLElement).style.width)
    const statusWidth = Number.parseInt((headers[5]!.element as HTMLElement).style.width)
    const actionWidth = Number.parseInt((headers[6]!.element as HTMLElement).style.width)
    expect(idWidth).toBeGreaterThan(55)
    expect(idWidth).toBeLessThan(120)
    expect(statusWidth).toBeGreaterThan(80)
    expect(statusWidth).toBeLessThan(150)
    expect(actionWidth).toBeLessThan(80)
    expect((headers[1]!.element as HTMLElement).style.width).toBe('')
    expect((headers[2]!.element as HTMLElement).style.width).toBe('200px')
    expect((headers[3]!.element as HTMLElement).style.width).toBe('200px')
    expect(wrapper.get('table[data-slot="base"]').classes()).toContain('!min-w-[1200px]')
  })

  it('shows Mongo IDs from the row data', async () => {
    const wrapper = await mountSuspended(SettingsTable, {
      props: {
        data: [{ _id: '507f1f77bcf86cd799439011', name: 'Mongo row' }],
        columns: [{ accessorKey: 'name', header: 'Name' }],
      },
    })
    await flushPromises()
    expect(wrapper.get('thead').text()).toContain('ID')
    expect(wrapper.get('tbody td').text()).toBe('507f1f77bcf86cd799439011')
  })

  it('gives a long Mongo ID room without stretching numeric IDs elsewhere', async () => {
    const wrapper = await mountSuspended(SettingsTable, {
      props: {
        data: [{ _id: '507f1f77bcf86cd799439011', name: 'Mongo row' }],
        columns: [{ accessorKey: 'name', header: 'Name' }],
      },
    })
    await flushPromises()
    expect((wrapper.get('thead th').element as HTMLElement).style.width).toBe('224px')
  })

  it('keeps the ellipsis when every row action is disabled', async () => {
    const wrapper = await mountSuspended(SettingsTable, {
      props: {
        data: [{ id: 4, name: 'Collection route' }],
        columns: [{ accessorKey: 'name', header: 'Route' }],
        actions: () => [
          { label: 'Disable', icon: 'lucide:power-off', disabled: true, onSelect: () => {} },
          { label: 'Delete', icon: 'lucide:trash-2', disabled: true, onSelect: () => {} },
        ],
      },
    })
    await flushPromises()
    expect(wrapper.get('tbody button').attributes('disabled')).toBeUndefined()
    await wrapper.get('tbody button').trigger('click')
    await flushPromises()
    const items = Array.from(document.body.querySelectorAll('[role="menuitem"]'))
    expect(items.map(item => item.textContent)).toEqual(expect.arrayContaining(['Disable', 'Delete']))
    expect(items.every(item => item.getAttribute('data-disabled') !== null || item.getAttribute('aria-disabled') === 'true')).toBe(true)
  })

  it('does not duplicate an explicit ID column', async () => {
    const wrapper = await mountSuspended(SettingsTable, {
      props: {
        data: [{ id: 1, name: 'First' }],
        columns: [{ accessorKey: 'id', header: 'Record ID' }, { accessorKey: 'name', header: 'Name' }],
      },
    })
    await flushPromises()
    expect(wrapper.findAll('thead th').map(cell => cell.text())).toEqual(['Record ID', 'Name'])
  })
})
