import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import { defineComponent, h, markRaw, ref } from 'vue'
import type { TabsItem } from '@nuxt/ui'
import { UCard, UTabs } from '#components'
import { useAppConfig } from '#imports'
import { tv } from '@nuxt/ui/utils/tv'
import tabsTheme from '#build/ui/tabs'
import Panel from '~/components/common/Panel.vue'
import FileManagerToolbar from '~/components/file/FileManagerToolbar.vue'
import { availableComponents } from '~/composables/dynamic/registry'

const sections = [
  { label: 'One', value: 'one', icon: 'lucide:settings-2' },
  { label: 'Two', value: 'two', icon: 'lucide:globe' },
]

describe('Shared panel', () => {
  it('omits absent native badge and tab options and preserves explicit disabled false', async () => {
    const wrapper = await mountSuspended(Panel, {
      props: { sections: [
        { value: 'one', label: 'One', badge: { color: 'unsupported', variant: 'unsupported' } },
        { value: 'two', label: 'Two', disabled: false },
      ] },
    })
    try {
      const props: unknown = wrapper.getComponent(UTabs<TabsItem>).props()
      expect(props).toMatchObject({
        modelValue: 'one',
        items: [
          { label: 'One', value: 'one', icon: undefined, badge: {}, slot: 'one' },
          { label: 'Two', value: 'two', icon: undefined, disabled: false, slot: 'two' },
        ],
      })
      if (!props || typeof props !== 'object' || !('items' in props) || !Array.isArray(props.items)) throw new Error('Expected native tab items')
      expect(Object.hasOwn(props.items[0] ?? {}, 'disabled')).toBe(false)
      expect(Object.hasOwn(props.items[1] ?? {}, 'badge')).toBe(false)
    } finally { wrapper.unmount() }
  })

  it('preserves native tab defaults when the registered sections become empty', async () => {
    const wrapper = await mountSuspended(Panel, { props: { sections } })
    try {
      expect(wrapper.getComponent(UTabs<TabsItem>).props()).toMatchObject({ modelValue: 'one' })
      await wrapper.setProps({ sections: [] })
      expect(wrapper.findComponent(UTabs).exists()).toBe(false)
    } finally { wrapper.unmount() }
  })

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

  it('hides the tab strip for one unlabeled section and gives its header the top header surface', async () => {
    const wrapper = await mountSuspended(Panel, {
      props: { sections: [{ value: 'records' }] },
      slots: { 'records-header': '<h2>Records</h2>', records: '<p>Rows</p>', footer: '<button>Next</button>' },
    })
    try {
      expect(wrapper.find('[role="tablist"]').exists()).toBe(false)
      expect(wrapper.get('[data-slot="header"]').text()).toBe('Records')
      expect(wrapper.get('[data-slot="header"] > div').classes()).toContain('eapp-panel-header-tier')
      expect(wrapper.get('[data-slot="footer"]').text()).toBe('Next')
    } finally { wrapper.unmount() }
  })

  it('puts the active section header below the header-surface tab strip without another tinted surface', async () => {
    const wrapper = await mountSuspended(Panel, {
      props: { modelValue: 'one', sections },
      slots: { 'one-header': '<div>Section tools</div>', one: '<p>First</p>' },
    })
    try {
      const header = wrapper.get('[data-slot="header"]')
      expect(header.find('[role="tablist"]').exists()).toBe(true)
      expect(header.text()).toContain('Section tools')
      expect(header.classes()).not.toContain('eapp-panel-header-tier')
    } finally { wrapper.unmount() }
  })

  it('keeps custom section actions in the shared bordered mobile tier', async () => {
    const tools = markRaw(defineComponent({ setup: () => () => [h('button', 'Grid/List'), h('button', 'Library menu')] }))
    const wrapper = await mountSuspended(Panel, {
      props: { sections: [{ value: 'library', title: 'File Manager', description: 'Manage files', actions: [{ id: 'library-tools', component: tools }] }] },
      slots: { library: '<p>Files</p>' },
    })
    try {
      const header = wrapper.get('[data-slot="header"]')
      expect(header.text()).toContain('File Manager')
      expect(header.text()).toContain('Grid/List')
      expect(header.text()).toContain('Library menu')
      const divider = header.get('[aria-hidden="true"].border-t')
      expect(divider.classes()).toContain('-mx-3')
      expect(divider.classes()).toContain('md:hidden')
      const actions = header.get('button').element.parentElement!
      expect(actions.classList.contains('ml-auto')).toBe(true)
      expect(actions.parentElement!.classList.contains('justify-end')).toBe(true)
      expect(actions.parentElement!.classList.contains('w-full')).toBe(true)
    } finally { wrapper.unmount() }
  })

  it('keeps File Manager view mode and menu together in one action cluster', async () => {
    const wrapper = await mountSuspended(FileManagerToolbar, {
      props: { viewMode: 'grid', folderCount: 0, fileCount: 2, moveMode: false, selectionMode: false, busy: false, loading: false, canCreateFolder: true, canSelect: true },
    })
    try {
      expect(wrapper.find('h2').exists()).toBe(false)
      expect(wrapper.classes()).toContain('justify-end')
      expect(wrapper.classes()).not.toContain('justify-between')
      expect(wrapper.get('[aria-label="Grid view"]').attributes('aria-pressed')).toBe('true')
      await wrapper.get('[aria-label="List view"]').trigger('click')
      expect(wrapper.emitted('update:viewMode')).toEqual([['list']])
      await wrapper.setProps({ viewMode: 'list' })
      expect(wrapper.get('[aria-label="List view"]').attributes('aria-pressed')).toBe('true')
      expect(wrapper.find('[aria-label="Library actions"]').exists()).toBe(true)
    } finally { wrapper.unmount() }
  })

  it('does not create an empty action row for a heading-only section', async () => {
    const wrapper = await mountSuspended(Panel, {
      props: { sections: [{ value: 'library', title: 'File Manager' }] },
      slots: { library: '<p>Files</p>' },
    })
    try {
      const stack = wrapper.get('[data-slot="header"] > div > div')
      expect(stack.element.children).toHaveLength(1)
      expect(stack.text()).toBe('File Manager')
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
