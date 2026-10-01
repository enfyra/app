import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { defineComponent, h, ref, type Component } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { UBadge, UDropdownMenu, UTheme } from '#components'
import Pagination from '~/components/data-table/Pagination.vue'
import Drawer from '~/components/common/Drawer.vue'
import Modal from '~/components/common/Modal.vue'
import CollectionVisibilityControl from '~/components/route/CollectionVisibilityControl.vue'

const OverlayStub = defineComponent({
  template: '<div><slot name="header" /><slot name="title" /><slot name="body" /><slot name="footer" /></div>',
})
const mounted: { unmount: () => void }[] = []
afterEach(() => { mounted.splice(0).forEach(wrapper => wrapper.unmount()) })

describe('shared table and action feedback', () => {
  it('updates both pagers immediately while a page request is pending', async () => {
    const page = ref(1)
    const Host = defineComponent({ setup: () => () => h(Pagination, {
      total: 100, itemsPerPage: 10, loading: true, page: page.value,
      'onUpdate:page': (value: number) => { page.value = value },
    }) })
    const wrapper = await mountSuspended(Host)
    mounted.push(wrapper)
    await wrapper.get('[aria-label="Next Page"]').trigger('click')
    expect(page.value).toBe(2)
    expect(wrapper.get('[aria-label="Page 2"]').attributes('aria-current')).toBe('page')
    expect(wrapper.get('[aria-label="Next Page"]').attributes('disabled')).toBeUndefined()
  })

  for (const [name, component, stub] of [
    ['drawer', Drawer, 'UDrawer'],
    ['modal', Modal, 'UModal'],
  ] as const) {
    it(`shows ${name} action loading throughout async validation`, async () => {
      let complete!: () => void
      const onClick = vi.fn(() => new Promise<void>(resolve => { complete = resolve }))
      const wrapper = await mountSuspended(component as Component, {
        props: { modelValue: true, primaryAction: { label: 'Save', onClick } },
        slots: { body: '<div>Form</div>' },
        global: { stubs: { [stub]: OverlayStub } },
      })
      mounted.push(wrapper)
      const button = wrapper.findAll('button').find(button => button.text() === 'Save')!
      await button.trigger('click')
      expect(button.attributes('disabled')).toBeDefined()
      expect(onClick).toHaveBeenCalledOnce()
      complete()
      await flushPromises()
      expect(button.attributes('disabled')).toBeUndefined()
    })
  }

  it('changes Collection Routes visibility immediately with a switch', async () => {
    const enabled = ref(false)
    const Host = defineComponent({ setup: () => () => h(CollectionVisibilityControl, {
      modelValue: enabled.value,
      'onUpdate:modelValue': (value: boolean) => { enabled.value = value },
    }) })
    const wrapper = await mountSuspended(Host)
    mounted.push(wrapper)
    await wrapper.get('[role="switch"]').trigger('click')
    expect(enabled.value).toBe(true)
    expect(wrapper.get('[role="switch"]').attributes('aria-checked')).toBe('true')
  })

  it('bounds the badge and truncates only its label', async () => {
    const wrapper = await mountSuspended(UBadge, { props: { label: 'a_very_long_role_name', color: 'primary', variant: 'soft' } })
    mounted.push(wrapper)
    expect(wrapper.classes()).toContain('max-w-full')
    expect(wrapper.get('[data-slot="label"]').classes()).toContain('truncate')
  })

  it('uses the non-modal dropdown default without a local prop', async () => {
    const Host = defineComponent({
      components: { UTheme, UDropdownMenu },
      template: '<UTheme :props="{ dropdownMenu: { modal: false } }"><UDropdownMenu :items="[{ label: \'Delete\' }]"><button>Actions</button></UDropdownMenu></UTheme>',
    })
    const wrapper = await mountSuspended(Host)
    mounted.push(wrapper)
    expect(wrapper.findComponent({ name: 'DropdownMenuRoot' }).props('modal')).toBe(false)
  })
})
