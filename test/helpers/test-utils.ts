import { ref, computed } from 'vue'
import type { MenuItem, MiniSidebar } from '~/utils/types/menu'

export const createMockState = <T>(initialValue: T) => {
  const state = ref(initialValue)
  return {
    get value() {
      return state.value
    },
    set value(newValue: T) {
      state.value = newValue
    }
  }
}

export const mockUseState = <T>(key: string, initialValue: () => T) => {
  return createMockState(initialValue())
}

export const createMockApiResponse = <T>(data: T, delay = 0) => {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve({ data })
    }, delay)
  })
}

export const createTestMenuItem = (overrides: Partial<MenuItem> = {}): MenuItem => ({
  id: '1',
  label: 'Test Menu',
  route: '/test',
  icon: 'lucide:test',
  sidebarId: 1,
  permission: undefined,
  path: '/test',
  children: [],
  order: 1,
  type: 'Menu',
  parent: null,
  sidebar: null,
  description: 'Test menu item',
  isEnabled: true,
  isSystem: false,
  menus: [],
  extension: null,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  ...overrides
})

export const createTestMiniSidebar = (overrides: Partial<MiniSidebar> = {}): MiniSidebar => ({
  id: '1',
  label: 'Test Sidebar',
  icon: 'lucide:test',
  route: '/test',
  permission: undefined,
  position: 'top',
  ...overrides
})

export const mockPermissions = {
  public: null,
  authenticated: {
    and: [
      { route: '/test', actions: ['read'] }
    ]
  },
  admin: {
    and: [
      { route: '/test', actions: ['create', 'read', 'update', 'delete'] }
    ]
  }
}

export const nextTick = () => new Promise(resolve => setTimeout(resolve, 0))

export const mockToast = {
  add: () => {},
  remove: () => {},
  clear: () => {}
}

export const mockNavigateTo = () => {}

export const mockRoute = {
  path: '/test',
  params: {},
  query: {},
  name: 'test'
}