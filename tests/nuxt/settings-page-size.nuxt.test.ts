import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import { defineComponent, h } from 'vue'
import { useSettingsPageSize } from '~/composables/data-table/useSettingsPageSize'

const PageSizeHost = defineComponent({
  setup() {
    const size = useSettingsPageSize('page-size-test')
    return () => h('button', { type: 'button', onClick: () => { size.value = 50 } }, String(size.value))
  },
})

describe('Settings page size', () => {
  it('restores a valid saved size after remount and ignores invalid saved values', async () => {
    localStorage.removeItem('settings-page-size:page-size-test')
    const first = await mountSuspended(PageSizeHost)
    expect(first.get('button').text()).toBe('10')
    await first.get('button').trigger('click')
    expect(localStorage.getItem('settings-page-size:page-size-test')).toBe('50')
    first.unmount()

    const second = await mountSuspended(PageSizeHost)
    expect(second.get('button').text()).toBe('50')
    second.unmount()

    localStorage.setItem('settings-page-size:page-size-test', '10000')
    const third = await mountSuspended(PageSizeHost)
    expect(third.get('button').text()).toBe('10')
    third.unmount()
    localStorage.removeItem('settings-page-size:page-size-test')
  })
})
