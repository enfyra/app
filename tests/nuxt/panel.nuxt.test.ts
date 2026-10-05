import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import { h, ref } from 'vue'
import { UCard, UTabs } from '#components'
import { useAppConfig } from '#imports'
import { tv } from '@nuxt/ui/utils/tv'
import tabsTheme from '#build/ui/tabs'
import Panel from '~/components/common/Panel.vue'
import { availableComponents } from '~/composables/dynamic/registry'

const sections = [
  { label: 'One', value: 'one', icon: 'lucide:settings-2' },
  { label: 'Two', value: 'two', icon: 'lucide:globe' },
]

describe('Shared panel', () => {
  it('keeps hidden section drafts mounted and emits the selected section', async () => {
    const draftValue = ref('original')
    const wrapper = await mountSuspended(availableComponents.Panel, {
      props: { modelValue: 'one', sections },
      slots: {
        one: () => h('input', { 'aria-label': 'Draft', value: draftValue.value, onInput: (event: Event) => { draftValue.value = (event.target as HTMLInputElement).value } }),
        two: '<p>Second panel</p>',
      },
    })
    try {
      expect(wrapper.findComponent(UCard).exists()).toBe(true)
      const draft = wrapper.get('input[aria-label="Draft"]')
      await draft.setValue('unsaved')
      await wrapper.findComponent(UTabs).findAll('[role="tab"]').find(tab => tab.text().includes('Two'))!.trigger('keydown', { key: 'Enter' })
      expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['two'])
      await wrapper.setProps({ modelValue: 'two' })
      expect(wrapper.get('input[aria-label="Draft"]').element).toBe(draft.element)
      await wrapper.setProps({ modelValue: 'one' })
      expect((wrapper.get('input[aria-label="Draft"]').element as HTMLInputElement).value).toBe('unsaved')
    } finally { wrapper.unmount() }
  })

  it('hides the tab strip for one unlabeled section and gives its header the top muted surface', async () => {
    const wrapper = await mountSuspended(Panel, {
      props: { sections: [{ value: 'records' }] },
      slots: { 'records-header': '<h2>Records</h2>', records: '<p>Rows</p>', footer: '<button>Next</button>' },
    })
    try {
      expect(wrapper.find('[role="tablist"]').exists()).toBe(false)
      expect(wrapper.get('[data-slot="header"]').text()).toBe('Records')
      expect(wrapper.get('[data-slot="header"] > div').classes()).toContain('bg-muted')
      expect(wrapper.get('[data-slot="footer"]').text()).toBe('Next')
    } finally { wrapper.unmount() }
  })

  it('puts the active section header below the muted tab strip without another muted surface', async () => {
    const wrapper = await mountSuspended(Panel, {
      props: { modelValue: 'one', sections },
      slots: { 'one-header': '<div>Section tools</div>', one: '<p>First</p>' },
    })
    try {
      const header = wrapper.get('[data-slot="header"]')
      expect(header.find('[role="tablist"]').exists()).toBe(true)
      expect(header.text()).toContain('Section tools')
      expect(header.classes()).not.toContain('bg-muted')
    } finally { wrapper.unmount() }
  })

  it('keeps pill navigation independent of the header underline and uses theme roles', async () => {
    const items = [{ label: 'Overview', value: 'overview' }, { label: 'Usage', value: 'usage' }]
    expect(availableComponents.UTabs).toBe(UTabs)
    const wrapper = await mountSuspended(Panel, {
      props: { sections },
      slots: {
        one: () => h(availableComponents.UTabs, { modelValue: 'overview', items, variant: 'pill', color: 'primary', content: false }),
      },
    })
    try {
      const pill = wrapper.findAllComponents(UTabs)[1]!
      const ui = tv({ extend: tabsTheme, ...(useAppConfig().ui.tabs as unknown as typeof tabsTheme) })({ variant: 'pill', color: 'primary', orientation: 'horizontal' })
      expect(pill.get('[data-slot="list"]').classes()).toContain('bg-elevated')
      expect(pill.get('[data-slot="list"]').classes()).not.toContain('border-b-0')
      expect(ui.indicator()).toContain('bg-primary')
      expect(ui.indicator()).not.toContain('!bottom-0')
      expect(pill.get('[data-slot="trigger"]').classes()).toContain('data-[state=active]:text-inverted')
    } finally { wrapper.unmount() }
  })
})
