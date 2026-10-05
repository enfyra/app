import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises, type VueWrapper } from '@vue/test-utils'
import { UNavigationMenu } from '#components'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import UnifiedSidebar from '~/components/sidebar/UnifiedSidebar.vue'

const mounted: { unmount: () => void }[] = []
const hosts: HTMLElement[] = []
afterEach(() => {
  mounted.splice(0).forEach(wrapper => wrapper.unmount())
  hosts.splice(0).forEach(host => host.remove())
  localStorage.removeItem('sidebar-menu-open-keys')
  localStorage.removeItem('sidebar-open')
})

const menus = [
  { id: 'settings', label: 'Settings', route: '/settings', type: 'Dropdown Menu', position: 'top', isPublic: true, isEnabled: true },
  { id: 'oauth', label: 'OAuth', route: '/settings/oauth', parent: 'settings', type: 'Dropdown Menu', isPublic: true, isEnabled: true },
  { id: 'config', label: 'Configurations', route: '/settings/oauth/config', parent: 'oauth', type: 'Menu', isPublic: true, isEnabled: true },
  { id: 'accounts', label: 'Accounts', route: '/settings/oauth/accounts', parent: 'oauth', type: 'Menu', isPublic: true, isEnabled: true },
  { id: 'providers', label: 'Providers', parent: 'oauth', type: 'Dropdown Menu', isPublic: true, isEnabled: true },
  { id: 'advanced', label: 'Advanced', parent: 'providers', type: 'Dropdown Menu', isPublic: true, isEnabled: true },
  { id: 'audit', label: 'Audit', route: '/settings/runtime', parent: 'advanced', type: 'Menu', isPublic: true, isEnabled: true },
  { id: 'runtime', label: 'Runtime', route: '/settings/runtime', parent: 'settings', type: 'Menu', isPublic: true, isEnabled: true },
  { id: 'data', label: 'Data', route: '/data', type: 'Dropdown Menu', position: 'top', isPublic: true, isEnabled: true },
  { id: 'collections', label: 'Collections', route: '/collections', parent: 'data', type: 'Menu', isPublic: true, isEnabled: true },
]

async function mountSidebar(path = '/dashboard') {
  localStorage.removeItem('sidebar-menu-open-keys')
  localStorage.removeItem('sidebar-open')
  useState<any[]>('menu-items', () => []).value = menus.map(item => ({ ...item }))
  useState('screen:width', () => 1440).value = 1440
  useState('global:sidebar:visible', () => true).value = true
  useState<Record<string, boolean>>('sidebar-menu-open-keys', () => ({})).value = {
    Settings: true,
    OAuth: false,
    '/settings': true,
    '/settings/oauth': false,
    '/data': true,
  }
  useAuth().me.value = { isRootAdmin: true, roles: [] } as any
  const host = document.createElement('div')
  document.body.append(host)
  hosts.push(host)
  const wrapper = await mountSuspended(UnifiedSidebar, { route: path, attachTo: host })
  mounted.push(wrapper)
  await nextTick()
  await flushPromises()
  return wrapper
}

function row(wrapper: VueWrapper, label: string) {
  const element = wrapper.findAll('[data-slot="item"], [data-slot="childItem"]').find(item =>
    item.element.querySelector('[data-slot="linkLabel"]')?.textContent?.trim() === label)
  if (!element) throw new Error(`Missing sidebar row: ${label}`)
  return element
}

function state(wrapper: VueWrapper, label: string) {
  return row(wrapper, label).attributes('data-state')
}

function trigger(wrapper: VueWrapper, label: string) {
  return row(wrapper, label).get('[data-slot="link"]')
}

describe('sidebar native navigation', () => {
  it('keeps parent rows as toggle buttons rather than route links', async () => {
    const wrapper = await mountSidebar()
    for (const label of ['Settings', 'OAuth', 'Data']) {
      expect(trigger(wrapper, label).element.tagName).toBe('BUTTON')
      expect(trigger(wrapper, label).attributes('href')).toBeUndefined()
    }
  })

  it('expands and collapses OAuth without closing Settings or Data', async () => {
    const wrapper = await mountSidebar()
    const native = wrapper.findAllComponents(UNavigationMenu).find(menu => menu.text().includes('Settings'))!
    expect(state(wrapper, 'Settings')).toBe('open')
    expect(state(wrapper, 'OAuth')).toBe('closed')
    await trigger(wrapper, 'OAuth').trigger('click')
    await flushPromises()
    expect(state(wrapper, 'Settings'), JSON.stringify(native.emitted('update:modelValue'))).toBe('open')
    expect(state(wrapper, 'OAuth')).toBe('open')
    expect(state(wrapper, 'Data')).toBe('open')
    await trigger(wrapper, 'OAuth').trigger('click')
    await flushPromises()
    expect(state(wrapper, 'Settings')).toBe('open')
    expect(state(wrapper, 'OAuth')).toBe('closed')
    expect(state(wrapper, 'Data')).toBe('open')
  })

  it('allows toggling an active parent and keeps ancestors open on leaf selection', async () => {
    const wrapper = await mountSidebar('/settings/oauth/config')
    expect(state(wrapper, 'Settings')).toBe('open')
    await trigger(wrapper, 'Settings').trigger('click')
    await flushPromises()
    expect(state(wrapper, 'Settings')).toBe('closed')
    await trigger(wrapper, 'Settings').trigger('click')
    await flushPromises()
    expect(state(wrapper, 'Settings')).toBe('open')
    if (state(wrapper, 'OAuth') === 'closed') {
      await trigger(wrapper, 'OAuth').trigger('click')
      await flushPromises()
    }
    await wrapper.get('a[href="/settings/oauth/config"]').trigger('click')
    await flushPromises()
    expect(state(wrapper, 'Settings')).toBe('open')
    expect(state(wrapper, 'OAuth')).toBe('open')
  })

  it('does not close Data when Collections is selected', async () => {
    const wrapper = await mountSidebar()
    await wrapper.get('a[href="/collections"]').trigger('click')
    await flushPromises()
    expect(state(wrapper, 'Data')).toBe('open')
    expect(state(wrapper, 'Settings')).toBe('open')
  })

  it('persists each branch independently and keeps a child open while its parent is hidden', async () => {
    const wrapper = await mountSidebar()
    await trigger(wrapper, 'OAuth').trigger('click')
    await flushPromises()
    const openKeys = useState<Record<string, boolean>>('sidebar-menu-open-keys')
    expect(openKeys.value.OAuth).toBe(true)
    expect(openKeys.value.Settings).toBe(true)
    await trigger(wrapper, 'Settings').trigger('click')
    await flushPromises()
    expect(openKeys.value.Settings).toBe(false)
    expect(openKeys.value.OAuth).toBe(true)
    await trigger(wrapper, 'Settings').trigger('click')
    await flushPromises()
    expect(state(wrapper, 'OAuth')).toBe('open')
    expect(JSON.parse(localStorage.getItem('sidebar-menu-open-keys')!)).toMatchObject({ Settings: true, OAuth: true })
  })

  it('restores saved branch choices before native accordions mount', async () => {
    const wrapper = await mountSidebar()
    const openKeys = useState<Record<string, boolean>>('sidebar-menu-open-keys')
    openKeys.value = { Settings: true, OAuth: true, Data: false }
    localStorage.setItem('sidebar-menu-open-keys', JSON.stringify(openKeys.value))
    const host = document.createElement('div')
    document.body.append(host)
    hosts.push(host)
    const restored = await mountSuspended(UnifiedSidebar, { route: '/dashboard', attachTo: host })
    mounted.push(restored)
    await flushPromises()
    expect(state(restored, 'Settings')).toBe('open')
    expect(state(restored, 'OAuth')).toBe('open')
    expect(state(restored, 'Data')).toBe('closed')
    void wrapper
  })

  it('opens OAuth as a native submenu in the collapsed rail instead of an inline accordion', async () => {
    const wrapper = await mountSidebar()
    useState('global:sidebar:visible').value = false
    await flushPromises()
    const settings = wrapper.get('button[aria-label="Settings"]')
    expect(settings.element.parentElement?.closest('button, a')).toBeNull()
    await settings.trigger('click', { button: 0, ctrlKey: false })
    await flushPromises()
    const findMenuItem = (label: string) => Array.from(document.querySelectorAll<HTMLElement>('[role="menuitem"]'))
      .find(item => item.textContent?.trim() === label)
    await vi.waitFor(() => expect(findMenuItem('OAuth')).toBeDefined())
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    const oauth = findMenuItem('OAuth')!
    expect(oauth.getAttribute('aria-haspopup')).toBe('menu')
    expect(oauth.tagName, oauth.outerHTML).toBe('BUTTON')
    expect(oauth.getAttribute('href')).toBeNull()
    expect(oauth.querySelector('[data-slot="itemTrailingIcon"]')).not.toBeNull()
    oauth.click()
    await flushPromises()
    await vi.waitFor(() => expect(findMenuItem('Configurations')).toBeDefined())
    expect(document.querySelectorAll('[role="menu"]')).toHaveLength(2)
    expect(findMenuItem('Accounts')?.getAttribute('href')).toBe('/settings/oauth/accounts')
    expect(findMenuItem('Collections')).toBeUndefined()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await flushPromises()
  })

  it('opens four nested popup levels and retains the deepest leaf route', async () => {
    const wrapper = await mountSidebar()
    useState('global:sidebar:visible').value = false
    await flushPromises()
    await wrapper.get('button[aria-label="Settings"]').trigger('keydown', { key: 'ArrowDown' })
    const findMenuItem = (label: string) => Array.from(document.querySelectorAll<HTMLElement>('[role="menuitem"]'))
      .find(item => item.textContent?.trim() === label)
    for (const [index, label] of ['OAuth', 'Providers', 'Advanced'].entries()) {
      await vi.waitFor(() => expect(findMenuItem(label)).toBeDefined())
      expect(document.querySelectorAll('[role="menu"]')).toHaveLength(index + 1)
      const branch = findMenuItem(label)!
      expect(branch.getAttribute('aria-haspopup')).toBe('menu')
      branch.click()
      await flushPromises()
    }
    await vi.waitFor(() => expect(findMenuItem('Audit')).toBeDefined())
    expect(document.querySelectorAll('[role="menu"]')).toHaveLength(4)
    expect(findMenuItem('Audit')?.getAttribute('href')).toBe('/settings/runtime')
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    for (const menu of document.querySelectorAll<HTMLElement>('[role="menu"]')) {
      expect(menu.classList.contains('bg-default')).toBe(true)
      expect(menu.classList.contains('ring-default')).toBe(true)
      expect(menu.classList.contains('border')).toBe(false)
    }
  })
})
