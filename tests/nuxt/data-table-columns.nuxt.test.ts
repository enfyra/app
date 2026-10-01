import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { UTheme } from '#components'
import { defineComponent, h, ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import type { VisibilityState } from '@tanstack/vue-table'
import DataTable from '~/components/data-table/DataTable.vue'
import DataTableLazy from '~/components/data-table/DataTableLazy.vue'

describe('DataTable column picker', () => {
  for (const [name, component] of [['DataTable', DataTable], ['DataTableLazy', DataTableLazy]] as const) {
    it(`${name} toggles columns through the real menu, keeps it open and synchronizes external visibility`, async () => {
      const visibility = ref<VisibilityState>({})
      const Host = defineComponent({ setup: () => () => h(UTheme, { props: { dropdownMenu: { modal: false } } }, {
        default: () => h(component, {
          data: [{ id: 1, title: 'First', score: 7 }],
          columns: [
            { accessorKey: 'id', header: 'ID', enableHiding: false },
            { accessorKey: 'title', header: 'Title' },
            { accessorKey: 'score', header: 'Score' },
          ],
          columnVisibility: visibility.value,
          'onUpdate:columnVisibility': (value: VisibilityState) => { visibility.value = value },
        }),
      }) })
      const host = document.createElement('div')
      document.body.append(host)
      const wrapper = await mountSuspended(Host, { attachTo: host })
      const item = (label: string) => Array.from(document.querySelectorAll<HTMLElement>('[role="checkbox"]')).find(element => element.closest('[data-slot="root"]')?.textContent?.trim() === label)!
      try {
        await vi.waitFor(() => expect(wrapper.find('[aria-label="Choose visible columns"]').exists()).toBe(true))
        await wrapper.get('[aria-label="Choose visible columns"]').trigger('pointerdown', { pointerType: 'touch', button: 0, ctrlKey: false })
        await wrapper.get('[aria-label="Choose visible columns"]').trigger('click', { button: 0, ctrlKey: false })
        await vi.waitFor(() => expect(item('Title')).toBeDefined())
        expect(item('ID')).toBeUndefined()
        const checkboxRows = wrapper.findAllComponents({ name: 'UCheckbox' })
        expect(checkboxRows.every(row => row.props('ui').root.includes('cursor-pointer'))).toBe(true)
        const label = item('Title').closest('label')!
        label.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'touch', bubbles: true, button: 0 }))
        label.dispatchEvent(new PointerEvent('pointerup', { pointerType: 'touch', bubbles: true, button: 0 }))
        label.click()
        await flushPromises()
        expect(visibility.value.title).toBe(false)
        expect(wrapper.findAll('th').map(cell => cell.text())).toEqual(['ID', 'Score'])
        expect(item('Title').getAttribute('aria-checked')).toBe('false')
        item('Title').click()
        await flushPromises()
        expect(visibility.value.title).toBe(true)
        expect(wrapper.findAll('th').map(cell => cell.text())).toEqual(['ID', 'Title', 'Score'])
        visibility.value = { score: false }
        await flushPromises()
        expect(item('Score').getAttribute('aria-checked')).toBe('false')
        expect(wrapper.findAll('th').map(cell => cell.text())).toEqual(['ID', 'Title'])
        expect(wrapper.findComponent({ name: 'PopoverRoot' }).props('modal')).toBe(false)
      } finally {
        wrapper.unmount()
        host.remove()
      }
    })
  }

  it('uses a native popover for direct checkbox interaction', async () => {
    const wrapper = await mountSuspended(DataTable, { props: {
      data: [{ title: 'First' }], columns: [{ accessorKey: 'title', header: 'Title' }],
    } })
    try {
      expect(wrapper.findComponent({ name: 'UPopover' }).exists()).toBe(true)
      expect(wrapper.findComponent({ name: 'UDropdownMenu' }).exists()).toBe(false)
    } finally { wrapper.unmount() }
  })
})
