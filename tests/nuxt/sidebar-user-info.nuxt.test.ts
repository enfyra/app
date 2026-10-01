import { flushPromises } from '@vue/test-utils'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, defineComponent, h, ref } from 'vue'
import { USlideover } from '#components'

import SidebarUserInfo from '~/components/sidebar/UserInfo.vue'
import { useAuth } from '~/composables/shared/useAuth'

const screenWidth = ref(1280)
vi.mock('~/composables/shared/useScreen', () => ({
  useScreen: () => ({
    width: screenWidth,
    isDesktop: computed(() => screenWidth.value >= 1024),
    isMobile: computed(() => screenWidth.value < 768),
    isTablet: computed(() => screenWidth.value >= 768 && screenWidth.value < 1024),
  }),
}))
beforeEach(() => { screenWidth.value = 1280 })

vi.mock('~/composables/shared/useConfirm', () => ({
  useConfirm: () => ({ confirm: vi.fn().mockResolvedValue(false) }),
}))

describe('collapsed sidebar navigation', () => {
  it('uses Nuxt UI navigation with click popovers instead of hover expansion', async () => {
    const { readFileSync } = await import('node:fs')
    const { resolve } = await import('node:path')
    const source = readFileSync(resolve(process.cwd(), 'app/components/sidebar/UnifiedSidebar.vue'), 'utf8')
    expect(source).toContain('<UNavigationMenu')
    expect(source).toContain("mode: 'click'")
    expect(source).toContain('highlight\n')
    expect(source).not.toContain("ms-5 border-s border-[var(--nav-child-border)]")
    expect(source).toMatch(/const isDataItem[\s\S]*?active: isRouteExactActive\('\/data'\)/)
    expect(source).toMatch(/const isDataGroup[\s\S]*?active: isRouteExactActive\('\/data'\)/)
    expect(source).toContain('branchActive: children.some((child: any) => child.active || child.branchActive)')
    expect(source).not.toContain('showSidebarPeek')
    expect(source).not.toContain('SidebarMenuTree')
  })
})

describe('SidebarUserInfo', () => {
  it('uses native Appearance and Accent submenus and preserves registered notification rows', async () => {
    const { me } = useAuth()
    me.value = { id: 'user-1', email: 'dothinh115@gmail.com' } as any
    const registry = useAccountPanelRegistry()
    registry.clear()
    const activate = vi.fn()
    registry.register({ id: 'notifications', order: 40, label: 'Notifications', count: 3, onClick: activate })
    const wrapper = await mountSuspended(SidebarUserInfo, { route: '/dashboard', props: { collapsed: false } })
    try {
      const dropdown = wrapper.findComponent({ name: 'UDropdownMenu' })
      expect(dropdown.exists()).toBe(true)
      const items = dropdown.props('items').flat()
      expect(items.map((item: any) => item.label)).toEqual(['Profile', 'Appearance', 'Accent', 'Notifications', 'Log out'])
      const appearance = items.find((item: any) => item.label === 'Appearance')
      expect(appearance.children.map((item: any) => item.label)).toEqual(['Light', 'Dark', 'System'])
      expect(items.find((item: any) => item.label === 'Accent').children.length).toBeGreaterThan(0)
      items.find((item: any) => item.label === 'Notifications').onSelect(new Event('select'))
      expect(activate).toHaveBeenCalledOnce()
      expect(wrapper.text()).toContain('3')
      expect(wrapper.text()).not.toContain('Account')
      await wrapper.setProps({ collapsed: true })
      expect(wrapper.findComponent({ name: 'UDropdownMenu' }).exists()).toBe(true)
      expect(wrapper.find('button[aria-label="Open account menu"]').exists()).toBe(true)
      await flushPromises()
    } finally {
      wrapper.unmount()
      registry.clear()
    }
  })

  it('renders the Enfyra version from metadata below the account panel', async () => {
    const { me } = useAuth()
    me.value = { id: 'user-1', email: 'dothinh115@gmail.com' } as any
    useState<Record<string, any>>('global:settings', () => ({})).value = {
      enfyraVersion: '2.2.8-patch-1',
    }

    const wrapper = await mountSuspended(SidebarUserInfo, {
      route: '/data/cloud_email_senders',
      props: { collapsed: false },
    })

    expect(wrapper.text()).toContain('Powered by Enfyra')
    expect(wrapper.text()).toContain('v2.2.8-patch-1')
    wrapper.unmount()
  })
})

describe('mobile account sheet', () => {
  it('navigates submenus in one sheet, keeps appearance selections open and resets after explicit dismissal', async () => {
    screenWidth.value = 390
    useAccountPanelRegistry().clear()
    const host = document.createElement('div')
    document.body.append(host)
    const wrapper = await mountSuspended(SidebarUserInfo, { attachTo: host, route: '/dashboard' })
    const button = (label: string) => Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find(item => item.textContent?.trim() === label)!
    const mode = useColorMode()
    const preference = mode.preference
    try {
      expect(wrapper.findComponent({ name: 'UDropdownMenu' }).exists()).toBe(false)
      await wrapper.get('button').trigger('click')
      await vi.waitFor(() => expect(button('Appearance')).toBeDefined())
      button('Appearance').click()
      await flushPromises()
      expect(button('Dark')).toBeDefined()
      expect(button('Accent')).toBeUndefined()
      document.querySelector<HTMLButtonElement>('[aria-label="Back to account menu"]')!.click()
      await flushPromises()
      expect(button('Accent')).toBeDefined()
      button('Appearance').click()
      await flushPromises()
      button('Dark').click()
      await flushPromises()
      expect(mode.preference).toBe('dark')
      expect(wrapper.findComponent({ name: 'CommonDrawer' }).props('modelValue')).toBe(true)
      document.querySelector<HTMLButtonElement>('[data-vaul-drawer] button[aria-label="Close"]')!.click()
      await flushPromises()
      expect(wrapper.findComponent({ name: 'CommonDrawer' }).props('modelValue')).toBe(false)
      await wrapper.get('button').trigger('click')
      await vi.waitFor(() => expect(button('Appearance')).toBeDefined())
      expect(button('Dark')).toBeUndefined()
    } finally {
      mode.preference = preference
      wrapper.unmount()
      host.remove()
      useAccountPanelRegistry().clear()
    }
  })

  it('dismisses only the account sheet above the mobile sidebar and blocks background input', async () => {
    screenWidth.value = 390
    useAccountPanelRegistry().clear()
    const sidebarOpen = ref(true)
    const accountSheetOpen = useState('account-sheet-open', () => false)
    const backgroundClick = vi.fn()
    const Host = defineComponent({ setup: () => () => h('div', [
      h('button', { onClick: backgroundClick }, 'Background action'),
      h(USlideover, { open: sidebarOpen.value, dismissible: !accountSheetOpen.value, 'onUpdate:open': (value: boolean) => { sidebarOpen.value = value } }, {
        body: () => h(SidebarUserInfo),
      }),
    ]) })
    const host = document.createElement('div')
    document.body.append(host)
    const wrapper = await mountSuspended(Host, { attachTo: host, route: '/dashboard' })
    try {
      const trigger = () => document.querySelector<HTMLButtonElement>('button[aria-haspopup="dialog"]')!
      await vi.waitFor(() => expect(trigger()).toBeDefined())
      trigger().click()
      await vi.waitFor(() => expect(document.querySelector('[data-vaul-overlay]')).not.toBeNull())
      expect(document.documentElement.style.overflow).toBe('hidden')
      expect(wrapper.findComponent({ name: 'UDrawer' }).props('modal')).toBe(true)
      const overlay = document.querySelector<HTMLElement>('[data-vaul-overlay]')!
      overlay.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'touch', bubbles: true, button: 0 }))
      overlay.dispatchEvent(new PointerEvent('pointerup', { pointerType: 'touch', bubbles: true, button: 0 }))
      overlay.click()
      await flushPromises()
      expect(sidebarOpen.value).toBe(true)
      expect(wrapper.findComponent({ name: 'CommonDrawer' }).props('modelValue')).toBe(false)
      expect(backgroundClick).not.toHaveBeenCalled()
    } finally {
      wrapper.unmount()
      host.remove()
      useAccountPanelRegistry().clear()
    }
  })

  it('preserves custom nested actions and disabled state without closing after a leaf action', async () => {
    screenWidth.value = 844
    const registry = useAccountPanelRegistry()
    registry.clear()
    const activate = vi.fn()
    const disabled = vi.fn()
    registry.register({ id: 'tools', order: 40, label: 'Tools', children: [
      { label: 'Nested', children: [{ label: 'Execute', onSelect: activate }] },
      { label: 'Unavailable', disabled: true, onSelect: disabled },
    ] })
    const host = document.createElement('div')
    document.body.append(host)
    const wrapper = await mountSuspended(SidebarUserInfo, { attachTo: host, route: '/dashboard' })
    const button = (label: string) => Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find(item => item.textContent?.trim() === label)!
    try {
      await wrapper.get('button').trigger('click')
      await vi.waitFor(() => expect(button('Tools')).toBeDefined())
      button('Tools').click()
      await flushPromises()
      expect(button('Unavailable').disabled).toBe(true)
      button('Unavailable').click()
      expect(disabled).not.toHaveBeenCalled()
      button('Nested').click()
      await flushPromises()
      button('Execute').click()
      await flushPromises()
      expect(activate).toHaveBeenCalledOnce()
      expect(wrapper.findComponent({ name: 'CommonDrawer' }).props('modelValue')).toBe(true)
      screenWidth.value = 1280
      await flushPromises()
      expect(wrapper.findComponent({ name: 'UDropdownMenu' }).exists()).toBe(true)
    } finally {
      wrapper.unmount()
      host.remove()
      registry.clear()
    }
  })
})
