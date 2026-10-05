import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { compile } from 'tailwindcss'
import { parse } from 'postcss'
import { defineComponent, h, ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import CommonDrawer from '~/components/common/Drawer.vue'
import FilterBuilder from '~/components/filter/Builder.vue'
import FilterDatePicker from '~/components/filter/DatePicker.vue'
import UnsavedChangesModal from '~/components/common/UnsavedChangesModal.vue'
import type { FilterGroup } from '~/utils/common/filter/filter-types'

mockNuxtImport('useSchema', () => () => ({}))
mockNuxtImport('useScreen', () => () => ({ isMobile: ref(false), isTablet: ref(false) }))

async function zIndex(element: Element) {
  const compiler = await compile('@tailwind utilities;')
  const css = parse(compiler.build(Array.from(element.classList)))
  let value = 0
  css.walkDecls('z-index', declaration => { value = Number(declaration.value) })
  return value
}

describe('filter drawer column selection', () => {
  it.each(['keyboard', 'mouse', 'touch'])('opens the field menu above the drawer and updates the column with %s', async (input) => {
    const filter = ref<FilterGroup>({ id: 'root', operator: 'and', conditions: [] })
    const Host = defineComponent({
      setup: () => () => h(CommonDrawer, { modelValue: true }, {
        header: () => 'Filter records',
        body: () => h(FilterBuilder, {
          modelValue: filter.value,
          'onUpdate:modelValue': (value: FilterGroup) => { filter.value = value },
          tableName: 'records',
          schemas: { records: { definition: [
            { name: 'title', fieldType: 'column', type: 'varchar' },
            { name: 'score', fieldType: 'column', type: 'int' },
          ] } },
        }),
      }),
    })
    const host = document.createElement('div')
    document.body.append(host)
    const wrapper = await mountSuspended(Host, { attachTo: host, route: '/login' })
    try {
      await vi.waitFor(() => expect(Array.from(document.querySelectorAll('button')).find(button => button.textContent?.includes('Add Filter'))).toBeDefined())
      Array.from(document.querySelectorAll('button')).find(button => button.textContent?.includes('Add Filter'))!.click()
      await flushPromises()
      expect(filter.value.conditions).toHaveLength(1)
      const trigger = document.querySelector<HTMLButtonElement>('.filter-condition-field [role="combobox"]')!
      if (input === 'keyboard') {
        trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
      } else {
        trigger.dispatchEvent(new PointerEvent('pointerdown', { pointerType: input, button: 0, bubbles: true }))
        trigger.dispatchEvent(new PointerEvent('pointerup', { pointerType: input, button: 0, bubbles: true }))
        trigger.click()
      }
      await vi.waitFor(() => expect(document.querySelector('[role="listbox"]')).not.toBeNull())
      const menu = document.querySelector('[role="listbox"]')!
      const drawer = trigger.closest('[data-slot="content"]')!
      expect(await zIndex(menu)).toBeGreaterThan(await zIndex(drawer))
      const score = Array.from(menu.querySelectorAll<HTMLElement>('[role="option"]')).find(option => option.textContent?.trim() === 'score')!
      if (input === 'keyboard') {
        score.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
      } else {
        score.dispatchEvent(new PointerEvent('pointerdown', { pointerType: input, button: 0, bubbles: true }))
        score.dispatchEvent(new PointerEvent('pointerup', { pointerType: input, button: 0, bubbles: true }))
        score.click()
      }
      await flushPromises()
      expect(filter.value.conditions[0]).toMatchObject({ field: 'score', type: 'number', operator: '_eq' })
      expect(trigger.textContent).toContain('score')
    } finally {
      wrapper.unmount()
      host.remove()
    }
  })

  it('keeps calendar popovers above nested drawers and discard confirmation above them', async () => {
    const nestedOpen = ref(false)
    const confirmOpen = ref(false)
    const Host = defineComponent({
      setup: () => () => h(CommonDrawer, { modelValue: true }, {
        header: () => 'Parent drawer',
        body: () => [
          h('button', { onClick: () => { nestedOpen.value = true } }, 'Open nested drawer'),
          h(CommonDrawer, { modelValue: nestedOpen.value, nested: true }, {
            header: () => 'Nested drawer',
            body: () => [
              h(FilterDatePicker, { modelValue: '2026-10-05', mode: 'single' }),
              h('button', { onClick: () => { confirmOpen.value = true } }, 'Confirm discard'),
              h(UnsavedChangesModal, { modelValue: confirmOpen.value, content: 'Discard this draft?' }),
            ],
          }),
        ],
      }),
    })
    const host = document.createElement('div')
    document.body.append(host)
    const wrapper = await mountSuspended(Host, { attachTo: host, route: '/login' })
    const button = (label: string) => Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find(element => element.textContent?.trim() === label)!
    try {
      await vi.waitFor(() => expect(button('Open nested drawer')).toBeDefined())
      const parent = button('Open nested drawer').closest('[data-slot="content"]')!
      button('Open nested drawer').click()
      await vi.waitFor(() => expect(button('Confirm discard')).toBeDefined())
      const nested = button('Confirm discard').closest('[data-slot="content"]')!
      expect(await zIndex(nested)).toBe(await zIndex(parent))
      expect(parent.compareDocumentPosition(nested) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
      const dateTrigger = nested.querySelector<HTMLButtonElement>('[aria-haspopup="dialog"]')!
      dateTrigger.click()
      await vi.waitFor(() => expect(document.querySelector('.filter-date-picker-popover')).not.toBeNull())
      const calendar = document.querySelector('.filter-date-picker-popover')!.closest('[data-slot="content"]')!
      expect(await zIndex(calendar)).toBeGreaterThan(await zIndex(nested))
      button('Confirm discard').click()
      await vi.waitFor(() => expect(button('Discard Changes')).toBeDefined())
      const confirmation = button('Discard Changes').closest('[data-slot="content"]')!
      expect(await zIndex(confirmation)).toBeGreaterThan(await zIndex(calendar))
      expect(document.documentElement.style.overflow).toBe('hidden')
    } finally {
      wrapper.unmount()
      host.remove()
    }
  })
})
