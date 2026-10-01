import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { defineComponent, h, ref } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

mockNuxtImport('useDatabase', () => () => ({ getId: (record: { id?: number }) => record?.id }))
mockNuxtImport('useSchema', () => () => ({
  ensureSchema: vi.fn().mockResolvedValue(undefined),
  generateEmptyForm: () => ({}),
  validate: () => ({ isValid: true, errors: {} }),
}))
mockNuxtImport('useApi', () => () => ({ data: ref(null), pending: ref(false), execute: vi.fn() }))
mockNuxtImport('useScreen', () => () => ({ isMobile: ref(false), isTablet: ref(false) }))

import CreateDrawer from '~/components/form/relation/CreateDrawer.vue'
import CommonDrawer from '~/components/common/Drawer.vue'

const DrawerStub = defineComponent({
  props: { modelValue: Boolean, nested: Boolean },
  emits: ['update:modelValue'],
  template: '<div><slot name="header" /><div data-testid="drawer-body"><slot name="body" /></div><button @click="$emit(\'update:modelValue\', false)">Close</button></div>',
})

const FormStub = defineComponent({
  props: { mode: String },
  emits: ['has-changed'],
  template: '<div data-testid="record-form"><button @click="$emit(\'has-changed\', true)">Edit field</button></div>',
})

async function mountDrawer() {
  return mountSuspended(CreateDrawer, {
    props: { modelValue: true, relationMeta: { targetTableName: 'users' }, selected: [] },
    global: { stubs: {
      CommonDrawer: DrawerStub,
      FormEditorLazy: FormStub,
      CommonUnsavedChangesModal: true,
    } },
  })
}

describe('relation create drawer', () => {
  it('mounts within the real parent drawer context only when the relation picker opens', async () => {
    const Host = defineComponent({
      props: { parentOpen: Boolean, createOpen: Boolean },
      setup(props) {
        return () => h(CommonDrawer, { modelValue: props.parentOpen }, {
          header: () => 'Relations',
          body: () => h(CreateDrawer, { modelValue: props.createOpen, relationMeta: { targetTableName: 'users' }, selected: [] }),
        })
      },
    })
    const wrapper = await mountSuspended(Host, {
      props: { parentOpen: false, createOpen: false },
      global: { stubs: { FormEditorLazy: FormStub, CommonUnsavedChangesModal: true } },
    })
    expect(wrapper.findComponent(CreateDrawer).exists()).toBe(false)
    await wrapper.setProps({ parentOpen: true })
    await flushPromises()
    expect(wrapper.getComponent(CreateDrawer).props('modelValue')).toBe(false)
    await wrapper.setProps({ createOpen: true })
    await flushPromises()
    expect(wrapper.getComponent(FormStub).props('mode')).toBe('create')
    await wrapper.setProps({ createOpen: false, parentOpen: false })
    wrapper.unmount()
  })

  it('uses a nested drawer and renders the create form directly in its body', async () => {
    const wrapper = await mountDrawer()
    expect(wrapper.getComponent(DrawerStub).props('nested')).toBe(true)
    expect(wrapper.getComponent(FormStub).props('mode')).toBe('create')
    expect(wrapper.get('[data-testid="record-form"]').element.parentElement).toBe(wrapper.get('[data-testid="drawer-body"]').element)
    expect(wrapper.text()).not.toContain('Form Fields')
    wrapper.unmount()
  })

  it('keeps unsaved-change confirmation when the drawer is closed', async () => {
    const wrapper = await mountDrawer()
    await wrapper.get('[data-testid="record-form"] button').trigger('click')
    await wrapper.findAll('button').at(-1)!.trigger('click')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(wrapper.getComponent({ name: 'CommonUnsavedChangesModal' }).attributes('modelvalue')).toBe('true')
    wrapper.unmount()
  })
})
