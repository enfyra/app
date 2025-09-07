import { ref, computed } from 'vue'
import type { MenuItem, MiniSidebar } from '~/utils/types/menu'

// Mock Vue composables for testing
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

// Mock useState function
export const mockUseState = <T>(key: string, initialValue: () => T) => {
  return createMockState(initialValue())
}

// Mock API responses
export const createMockApiResponse = <T>(data: T, delay = 0) => {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve({ data })
    }, delay)
  })
}

// Helper to create test menu items
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

// Helper to create test mini sidebar
export const createTestMiniSidebar = (overrides: Partial<MiniSidebar> = {}): MiniSidebar => ({
  id: '1',
  label: 'Test Sidebar',
  icon: 'lucide:test',
  route: '/test',
  permission: undefined,
  position: 'top',
  ...overrides
})

// Mock permission conditions
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

// Helper to wait for next tick in tests
export const nextTick = () => new Promise(resolve => setTimeout(resolve, 0))

// Mock toast notifications
export const mockToast = {
  add: () => {},
  remove: () => {},
  clear: () => {}
}

// Mock navigation
export const mockNavigateTo = () => {}

// Mock route object
export const mockRoute = {
  path: '/test',
  params: {},
  query: {},
  name: 'test'
}