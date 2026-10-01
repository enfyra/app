import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import { h, ref } from 'vue'
import { UCard, UTabs } from '#components'
import TabbedPanel from '~/components/common/TabbedPanel.vue'
import { availableComponents } from '~/composables/dynamic/registry'

describe('Shared tabbed panel', () => {
  it('retains native tab events and mounted draft content inside one frame', async () => {
    const draftValue = ref('original')
    const wrapper = await mountSuspended(availableComponents.TabbedPanel, {
      props: { modelValue: 'one', items: [{ label: 'One', value: 'one', slot: 'one' }, { label: 'Two', value: 'two', slot: 'two' }] },
      slots: {
        one: () => h('input', { 'aria-label': 'Draft', value: draftValue.value, onInput: (event: Event) => { draftValue.value = (event.target as HTMLInputElement).value } }),
        two: '<p>Second panel</p>',
      },
    })
    try {
      expect(wrapper.findComponent(UCard).exists()).toBe(true)
      const draft = wrapper.get('input[aria-label="Draft"]')
      await draft.setValue('unsaved')
      const tabs = wrapper.findComponent(UTabs)
      await tabs.findAll('[role="tab"]').find(tab => tab.text() === 'Two')!.trigger('keydown', { key: 'Enter' })
      expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['two'])
      await wrapper.setProps({ modelValue: 'two' })
      expect(wrapper.get('input[aria-label="Draft"]').element).toBe(draft.element)
      await wrapper.setProps({ modelValue: 'one' })
      expect((wrapper.get('input[aria-label="Draft"]').element as HTMLInputElement).value).toBe('unsaved')
    } finally { wrapper.unmount() }
  })

  it('puts an external native tab strip in the Card header and keeps the content in its body', async () => {
    const wrapper = await mountSuspended(TabbedPanel, {
      slots: { header: '<div role="tablist">External tabs</div>', default: '<p>Panel contents</p>' },
    })
    try {
      expect(wrapper.get('[data-slot="header"]').text()).toBe('External tabs')
      expect(wrapper.get('[data-slot="body"]').text()).toBe('Panel contents')
      expect(wrapper.findAll('[role="tablist"]')).toHaveLength(1)
    } finally { wrapper.unmount() }
  })
})
