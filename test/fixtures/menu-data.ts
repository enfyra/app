import type { MenuDefinition, MenuApiItem } from '~/utils/types/menu'

export const mockMenuDefinitions: MenuDefinition[] = [
  {
    id: 1,
    description: 'Dashboard mini sidebar',
    icon: 'lucide:layout-dashboard',
    isEnabled: true,
    isSystem: true,
    label: 'Dashboard',
    order: 1,
    path: '/dashboard',
    permission: null,
    type: 'Mini Sidebar',
    parent: null,
    sidebar: null,
    children: [],
    menus: [],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 2,
    description: 'Data mini sidebar',
    icon: 'lucide:database',
    isEnabled: true,
    isSystem: true,
    label: 'Data',
    order: 2,
    path: '/data',
    permission: null,
    type: 'Mini Sidebar',
    parent: null,
    sidebar: null,
    children: [],
    menus: [],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 3,
    description: 'Collections mini sidebar',
    icon: 'lucide:layers',
    isEnabled: true,
    isSystem: true,
    label: 'Collections',
    order: 3,
    path: '/collections',
    permission: null,
    type: 'Mini Sidebar',
    parent: null,
    sidebar: null,
    children: [],
    menus: [],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 4,
    description: 'Files dropdown menu',
    icon: 'lucide:folder',
    isEnabled: true,
    isSystem: false,
    label: 'Files',
    order: 1,
    path: '',
    permission: null,
    type: 'Dropdown Menu',
    parent: null,
    sidebar: { id: 2 },
    children: [
      {
        id: 5,
        label: 'Browse Files',
        path: '/files',
        icon: 'lucide:file-text',
        permission: null
      },
      {
        id: 6,
        label: 'Folders',
        path: '/storage/management',
        icon: 'lucide:folder',
        permission: null
      }
    ],
    menus: [],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 7,
    description: 'Settings dropdown menu',
    icon: 'lucide:settings',
    isEnabled: true,
    isSystem: true,
    label: 'Settings',
    order: 2,
    path: '',
    permission: null,
    type: 'Dropdown Menu',
    parent: null,
    sidebar: { id: 1 },
    children: [
      {
        id: 8,
        label: 'Users',
        path: '/settings/users',
        icon: 'lucide:users',
        permission: null
      },
      {
        id: 9,
        label: 'Roles',
        path: '/settings/roles',
        icon: 'lucide:shield',
        permission: null
      },
      {
        id: 10,
        label: 'Menus',
        path: '/settings/menus',
        icon: 'lucide:menu',
        permission: null
      }
    ],
    menus: [],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 11,
    description: 'Direct menu item',
    icon: 'lucide:home',
    isEnabled: true,
    isSystem: false,
    label: 'Overview',
    order: 1,
    path: '/overview',
    permission: null,
    type: 'Menu',
    parent: null,
    sidebar: { id: 1 },
    children: [],
    menus: [],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
]

export const mockApiResponse = {
  data: mockMenuDefinitions
}

export const mockEmptyApiResponse = {
  data: []
}

export const mockMenuApiItems: MenuApiItem[] = mockMenuDefinitions.map(item => ({
  ...item,
  extension: null
}))