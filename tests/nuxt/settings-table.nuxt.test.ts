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
    expect(wrapper.get('table[data-slot="base"]').classes()).toContain('table-auto')
    expect(wrapper.get('table[data-slot="base"]').classes()).toContain('!min-w-full')
    const footer = wrapper.get('.border-t.border-default.px-3.py-3')
    expect(footer.text()).toContain('Rows per page')
    expect(footer.text()).toContain('1–10 / 24')
    expect(footer.find('nav[data-slot="root"]').exists()).toBe(true)
    expect(wrapper.get('.eapp-settings-pagination').classes()).toContain('grid')
    expect(wrapper.get('.eapp-settings-pagination').classes()).toContain('md:grid-cols-[minmax(0,1fr)_auto_minmax(0,max-content)]')
    const pager = wrapper.get('.eapp-settings-pagination nav[data-slot="root"]')
    expect(pager.get('[data-slot="list"]').classes()).toContain('flex-nowrap')
    const scroller = pager.element.parentElement!
    expect(scroller.classList.contains('overflow-x-auto')).toBe(true)
    expect(scroller.parentElement!.classList.contains('border-t')).toBe(true)
    expect(scroller.parentElement!.classList.contains('-mx-3')).toBe(true)
    expect(wrapper.find('[aria-label="Choose visible columns"]').exists()).toBe(false)
    expect(document.body.querySelector('.eapp-pagination-mini')).not.toBeNull()
    expect((document.body.querySelector('.eapp-pagination-mini') as HTMLElement).style.display).toBe('none')
    expect(wrapper.classes()).toContain('w-full')
    expect(wrapper.find('[class*=eapp-page-constrained-wide]').exists()).toBe(false)
  })

  it('uses intrinsic ID and control widths so route content gets the remaining space', async () => {
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
    expect((headers[0]!.element as HTMLElement).style.width).toBe('1px')
    expect((headers[5]!.element as HTMLElement).style.width).toBe('')
    expect((headers[6]!.element as HTMLElement).style.width).toBe('56px')
    expect((headers[1]!.element as HTMLElement).style.width).toBe('')
    expect((headers[2]!.element as HTMLElement).style.width).toBe('1px')
    expect((headers[3]!.element as HTMLElement).style.width).toBe('1px')
    expect(wrapper.get('table[data-slot="base"]').classes()).toContain('table-auto')
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
    expect((wrapper.get('thead th').element as HTMLElement).style.width).toBe('1px')
    expect(wrapper.get('tbody td span').classes()).toContain('max-w-56')
  })

  it('lets an empty description stay compact and expand when it has content', async () => {
    const wrapper = await mountSuspended(SettingsTable, {
      props: {
        data: [{ id: 1492, name: 'Collection', description: '' }, { id: 1491, name: 'Another', description: null }],
        columns: [{ accessorKey: 'name', header: 'Collection' }, { accessorKey: 'description', header: 'Description' }],
      },
    })
    await flushPromises()
    expect((wrapper.findAll('thead th')[2]!.element as HTMLElement).style.width).toBe('1px')
    await wrapper.setProps({ data: [{ id: 1492, name: 'Collection', description: 'Customer data and preferences' }] })
    await flushPromises()
    expect((wrapper.findAll('thead th')[2]!.element as HTMLElement).style.width).toBe('')
    expect(wrapper.get('tbody').text()).toContain('Customer data and preferences')
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
