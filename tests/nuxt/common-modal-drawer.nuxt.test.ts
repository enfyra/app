import { defineComponent, h } from 'vue'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import CommonDrawer from '~/components/common/Drawer.vue'
import CommonModal from '~/components/common/Modal.vue'

const UModalStub = defineComponent({
  props: {
    open: { type: Boolean, default: false },
  },
  emits: ['update:open'],
  setup(props, { emit, slots }) {
    return () =>
      h('div', { 'data-testid': 'u-modal', 'data-open': String(props.open) }, [
        h('button', { 'data-testid': 'modal-close', onClick: () => emit('update:open', false) }),
        slots.title?.(),
        slots.body?.(),
        slots.footer?.(),
      ])
  },
})

const UDrawerStub = defineComponent({
  props: {
    open: { type: Boolean, default: false },
  },
  emits: ['update:open'],
  setup(props, { emit, slots }) {
    return () =>
      h('div', { 'data-testid': 'u-drawer', 'data-open': String(props.open) }, [
        h('button', { 'data-testid': 'drawer-close', onClick: () => emit('update:open', false) }),
        slots.header?.(),
        slots.body?.(),
        slots.footer?.(),
      ])
  },
})

const UButtonStub = defineComponent({
  props: {
    icon: { type: String, default: '' },
  },
  emits: ['click'],
  setup(props, { emit, slots }) {
    return () =>
      h(
        'button',
        {
          'data-testid': props.icon === 'lucide:x' ? 'drawer-x' : 'u-button',
          onClick: () => emit('click'),
        },
        slots.default?.() ?? '',
      )
  },
})

describe('CommonModal', () => {
  it('blocks close when preventClose is true', async () => {
    const wrapper = await mountSuspended(CommonModal, {
      route: '/login',
      props: {
        modelValue: true,
        preventClose: true,
      },
      slots: {
        title: () => 'Title',
        body: () => 'Body',
      },
      global: {
        stubs: {
          UModal: UModalStub,
        },
      },
    })

    await wrapper.get('[data-testid="modal-close"]').trigger('click')

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('emits close when preventClose is false', async () => {
    const wrapper = await mountSuspended(CommonModal, {
      route: '/login',
      props: {
        modelValue: true,
      },
      slots: {
        title: () => 'Title',
        body: () => 'Body',
      },
      global: {
        stubs: {
          UModal: UModalStub,
        },
      },
    })

    await wrapper.get('[data-testid="modal-close"]').trigger('click')

    expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
  })
})

describe('CommonDrawer', () => {
  it('emits close when drawer overlay requests close', async () => {
    const wrapper = await mountSuspended(CommonDrawer, {
      route: '/login',
      props: {
        modelValue: true,
      },
      slots: {
        header: () => 'Header',
        body: () => 'Body',
      },
      global: {
        stubs: {
          UDrawer: UDrawerStub,
          UButton: UButtonStub,
        },
      },
    })

    await wrapper.get('[data-testid="drawer-close"]').trigger('click')

    expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
  })

  it('hides the close button when showClose is false', async () => {
    const wrapper = await mountSuspended(CommonDrawer, {
      route: '/login',
      props: {
        modelValue: true,
        showClose: false,
      },
      slots: {
        header: () => 'Header',
        body: () => 'Body',
      },
      global: {
        stubs: {
          UDrawer: UDrawerStub,
          UButton: UButtonStub,
        },
      },
    })

    expect(wrapper.find('[data-testid="drawer-x"]').exists()).toBe(false)
  })
})
