import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import TablePicker from '~/components/flow/TablePicker.vue'

mockNuxtImport('useApi', () => () => ({
  pending: ref(false),
  execute: vi.fn().mockResolvedValue({ data: [{ id: 7, name: 'orders' }] }),
  cancel: vi.fn(),
}))

describe('Flow table picker', () => {
  it('preserves native leading-icon padding and selects the requested table id', async () => {
    const wrapper = await mountSuspended(TablePicker, { props: { valueKey: 'id' } })
    try {
      const input = wrapper.get('input[role="combobox"]')
      expect(input.classes()).toContain('ps-8')
      expect(input.classes().some(value => /^!p[xs]-/.test(value))).toBe(false)
      expect(wrapper.find('[data-slot="leading"]').exists()).toBe(true)
      const menu = wrapper.findComponent({ name: 'UInputMenu' })
      menu.vm.$emit('update:open', true)
      await flushPromises()
      expect(menu.props('items')).toEqual([{ label: 'orders', value: '7' }])
      menu.vm.$emit('update:modelValue', { label: 'orders', value: '7' })
      await flushPromises()
      expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['7'])
    } finally {
      wrapper.unmount()
    }
  })
})
