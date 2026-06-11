import { mountSuspended } from '@nuxt/test-utils/runtime'
import { nextTick } from 'vue'
import { describe, expect, it } from 'vitest'
import DateTimeField from '~/components/form/DateTimeField.vue'

describe('DateTimeField', () => {
  it('opens the picker drawer without requiring a parent drawer context', async () => {
    const wrapper = await mountSuspended(DateTimeField, {
      route: '/login',
      props: {
        modelValue: '2026-06-04T04:00:00',
      },
    })

    await wrapper.get('button').trigger('click')
    await nextTick()

    expect(document.body.textContent).toContain('Select date and time')
  })
})
