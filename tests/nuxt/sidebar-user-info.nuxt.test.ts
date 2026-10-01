import { flushPromises } from '@vue/test-utils'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it, vi } from 'vitest'

import SidebarUserInfo from '~/components/sidebar/UserInfo.vue'
import { useAuth } from '~/composables/shared/useAuth'

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
