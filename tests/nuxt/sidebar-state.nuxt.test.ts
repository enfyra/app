import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { TooltipProvider } from 'reka-ui'
import UnifiedSidebar from '~/components/sidebar/UnifiedSidebar.vue'

const mounted: { unmount: () => void }[] = []
const hosts: HTMLElement[] = []
const queries: { media: MediaQueryList; change: Set<(event: MediaQueryListEvent) => void> }[] = []
const originalWidth = window.innerWidth

function queryMatches(query: string, width: number) {
  const maximum = query.match(/max-width:\s*(\d+)px/)
  const minimum = query.match(/min-width:\s*(\d+)px/)
  return Boolean(maximum || minimum) && (!maximum || width <= Number(maximum[1])) && (!minimum || width >= Number(minimum[1]))
}

beforeEach(() => {
  queries.length = 0
  vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => {
    const change = new Set<(event: MediaQueryListEvent) => void>()
    const media = {
      matches: queryMatches(query, window.innerWidth),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: (_name: string, listener: (event: MediaQueryListEvent) => void) => change.add(listener),
      removeEventListener: (_name: string, listener: (event: MediaQueryListEvent) => void) => change.delete(listener),
      dispatchEvent: vi.fn(),
    } as unknown as MediaQueryList
    queries.push({ media, change })
    return media
  })
})

afterEach(() => {
  mounted.splice(0).forEach(wrapper => wrapper.unmount())
  hosts.splice(0).forEach(host => host.remove())
  localStorage.removeItem('sidebar-menu-open-keys')
  localStorage.removeItem('sidebar-open')
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalWidth })
  vi.restoreAllMocks()
})

async function setViewportWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width })
  for (const { media, change } of queries) {
    const matches = queryMatches(media.media, width)
    if (media.matches === matches) continue
    Object.defineProperty(media, 'matches', { configurable: true, value: matches })
    for (const listener of change) listener({ matches, media: media.media } as MediaQueryListEvent)
  }
  await nextTick()
  await flushPromises()
}

async function mountSidebar(path = '/dashboard', options: { width?: number; desktopOpen?: boolean; savedOpenKeys?: Record<string, boolean> } = {}) {
  const width = options.width ?? 1440
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width })
  useState<any[]>('menu-items', () => []).value = [
    { id: 'settings', label: 'Settings', route: '/settings', type: 'Dropdown Menu', position: 'top', isPublic: true, isEnabled: true },
    { id: 'oauth', label: 'OAuth', route: '/settings/oauth', parent: 'settings', type: 'Dropdown Menu', isPublic: true, isEnabled: true },
    { id: 'config', label: 'Configurations', route: '/settings/oauth/config', parent: 'oauth', type: 'Menu', isPublic: true, isEnabled: true },
    { id: 'runtime', label: 'Runtime', route: '/settings/runtime', parent: 'settings', type: 'Menu', isPublic: true, isEnabled: true },
    { id: 'dashboard', label: 'Dashboard', route: '/dashboard', type: 'Menu', position: 'top', isPublic: true, isEnabled: true },
  ]
  useState('screen:width', () => width).value = width
  useState('global:sidebar:visible', () => true).value = true
  useState('menu-definitions-pending', () => false).value = false
  useState<Record<string, boolean>>('sidebar-menu-open-keys', () => ({})).value = {}
  localStorage.setItem('sidebar-menu-open-keys', JSON.stringify(options.savedOpenKeys ?? {}))
  localStorage.setItem('sidebar-open', String(options.desktopOpen ?? true))
  useAuth().me.value = { isRootAdmin: true, roles: [] } as any
  const host = document.createElement('div')
  document.body.append(host)
  hosts.push(host)
  const wrapper = await mountSuspended(defineComponent({
    setup: () => () => h(TooltipProvider, {}, { default: () => h(UnifiedSidebar) }),
  }), { route: path, attachTo: host })
  mounted.push(wrapper)
  await flushPromises()
  return wrapper
}

function row(wrapper: VueWrapper, label: string) {
  const item = wrapper.findAll('[data-slot="item"], [data-slot="childItem"]').find(element =>
    element.element.querySelector('[data-slot="linkLabel"]')?.textContent?.trim() === label)
  if (!item) throw new Error(`Missing sidebar row: ${label}`)
  return item
}

async function reloadMenus() {
  useState('menu-definitions-pending').value = true
  await flushPromises()
  useState('menu-definitions-pending').value = false
  await new Promise(resolve => setTimeout(resolve, 220))
  await flushPromises()
}

describe('sidebar expansion persistence', () => {
  it('keeps automatically opened ancestry open after leaving its route and reloading menu metadata', async () => {
    const wrapper = await mountSidebar('/settings/oauth/config')
    expect(row(wrapper, 'Settings').attributes('data-state')).toBe('open')
    expect(row(wrapper, 'OAuth').attributes('data-state')).toBe('open')
    await useRouter().push('/dashboard')
    await flushPromises()
    expect(row(wrapper, 'Settings').attributes('data-state')).toBe('open')
    expect(row(wrapper, 'OAuth').attributes('data-state')).toBe('open')
    await reloadMenus()
    expect(row(wrapper, 'Settings').attributes('data-state')).toBe('open')
    expect(row(wrapper, 'OAuth').attributes('data-state')).toBe('open')
  })

  it('respects explicit closed choices on active ancestry', async () => {
    const wrapper = await mountSidebar('/settings/oauth/config', { savedOpenKeys: { Settings: false, OAuth: false } })
    expect(row(wrapper, 'Settings').attributes('data-state')).toBe('closed')
    await row(wrapper, 'Settings').get('[data-slot="link"]').trigger('click')
    await flushPromises()
    expect(row(wrapper, 'OAuth').attributes('data-state')).toBe('closed')
  })

  it('keeps explicitly opened branches through a metadata reload', async () => {
    const wrapper = await mountSidebar()
    await row(wrapper, 'Settings').get('[data-slot="link"]').trigger('click')
    await row(wrapper, 'OAuth').get('[data-slot="link"]').trigger('click')
    await flushPromises()
    await reloadMenus()
    expect(row(wrapper, 'Settings').attributes('data-state')).toBe('open')
    expect(row(wrapper, 'OAuth').attributes('data-state')).toBe('open')
  })

  it.each([true, false])('preserves desktop expansion (%s) through mobile entry, dismissal and return before viewport sync', async desktopOpen => {
    await mountSidebar('/dashboard', { desktopOpen })
    await setViewportWidth(900)
    expect(useState('screen:width').value).toBe(1440)
    expect(localStorage.getItem('sidebar-open')).toBe(String(desktopOpen))
    const visible = useState<boolean>('global:sidebar:visible')
    visible.value = true
    await flushPromises()
    expect(document.querySelector('[role="dialog"]')).not.toBeNull()
    visible.value = false
    await flushPromises()
    expect(localStorage.getItem('sidebar-open')).toBe(String(desktopOpen))
    await setViewportWidth(1440)
    expect(visible.value).toBe(desktopOpen)
    expect(localStorage.getItem('sidebar-open')).toBe(String(desktopOpen))
  })

  it('restores a collapsed desktop preference when starting on mobile', async () => {
    await mountSidebar('/dashboard', { width: 900, desktopOpen: false })
    await setViewportWidth(1440)
    expect(useState('global:sidebar:visible').value).toBe(false)
    expect(localStorage.getItem('sidebar-open')).toBe('false')
  })

  it('closes mobile navigation after a path change without changing the desktop preference', async () => {
    await mountSidebar()
    await setViewportWidth(900)
    useState('global:sidebar:visible').value = true
    await flushPromises()
    await useRouter().push('/settings/runtime')
    await flushPromises()
    expect(useState('global:sidebar:visible').value).toBe(false)
    expect(localStorage.getItem('sidebar-open')).toBe('true')
  })

  it('keeps mobile navigation open across query-only changes', async () => {
    await mountSidebar('/dashboard', { width: 900 })
    useState('global:sidebar:visible').value = true
    await flushPromises()
    await useRouter().push('/dashboard?filter=recent')
    await flushPromises()
    expect(useState('global:sidebar:visible').value).toBe(true)
  })

  it('persists an intentional desktop collapse and expansion', async () => {
    await mountSidebar()
    const visible = useState<boolean>('global:sidebar:visible')
    visible.value = false
    await flushPromises()
    expect(localStorage.getItem('sidebar-open')).toBe('false')
    visible.value = true
    await flushPromises()
    expect(localStorage.getItem('sidebar-open')).toBe('true')
  })
})

describe('sidebar active colors', () => {
  it('preserves the existing desktop active treatment', async () => {
    const wrapper = await mountSidebar('/settings/runtime')
    const link = row(wrapper, 'Runtime').get('[data-slot="link"]')
    expect(link.classes()).toContain('!text-[var(--nav-item-hover-text)]')
    expect(link.classes()).toContain('before:!bg-[var(--nav-item-hover-bg)]')
    expect(link.classes()).not.toContain('before:!bg-[var(--nav-item-active-bg)]')
  })

  it('preserves the existing collapsed icon rail colors', async () => {
    const wrapper = await mountSidebar('/dashboard', { desktopOpen: false })
    const link = wrapper.get('[aria-label="Dashboard"]')
    expect(link.classes()).toContain('!bg-[var(--nav-item-hover-bg)]')
    expect(link.classes()).toContain('!text-[var(--nav-item-hover-text)]')
  })

  it('preserves the native dropdown active treatment in collapsed mode', async () => {
    const wrapper = await mountSidebar('/settings/runtime', { desktopOpen: false })
    await wrapper.get('button[aria-label="Settings"]').trigger('click', { button: 0, ctrlKey: false })
    await flushPromises()
    const item = Array.from(document.querySelectorAll<HTMLElement>('[role="menuitem"]'))
      .find(element => element.textContent?.trim() === 'Runtime')
    expect(item).toBeDefined()
    expect(item!.classList.contains('before:!bg-[var(--menu-item-hover-bg)]')).toBe(true)
    expect(item!.classList.contains('!text-[var(--text-primary)]')).toBe(true)
  })

  it('uses the desktop active treatment in the mobile menu', async () => {
    await mountSidebar('/settings/runtime', { width: 900 })
    useState('global:sidebar:visible').value = true
    await flushPromises()
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!
    const link = dialog.querySelector<HTMLAnchorElement>('a[href="/settings/runtime"]')!
    expect(link.classList.contains('!text-[var(--nav-item-hover-text)]')).toBe(true)
    expect(link.classList.contains('before:!bg-[var(--nav-item-hover-bg)]')).toBe(true)
    expect(link.classList.contains('before:!bg-[var(--nav-item-active-bg)]')).toBe(false)
  })

  it('separates the brand cluster from the menu with the group divider', async () => {
    const wrapper = await mountSidebar('/dashboard')
    const header = wrapper.get('[data-slot="header"]')
    const border = header.get('[data-slot="border"]')
    expect(border.classes()).toContain('border-[var(--nav-child-border)]')
    expect(header.element.contains(border.element)).toBe(true)
    expect(wrapper.get('.sidebar-scroll-area').element.contains(border.element)).toBe(false)
  })

  it('matches the mobile menu surface to the desktop sidebar', async () => {
    await mountSidebar('/dashboard', { width: 900 })
    useState('global:sidebar:visible').value = true
    await flushPromises()
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]')
    expect(dialog).not.toBeNull()
    expect(dialog!.classList.contains('!bg-[var(--shell-sidebar-bg)]')).toBe(true)
    expect(dialog!.classList.contains('!divide-transparent')).toBe(true)
  })
})
