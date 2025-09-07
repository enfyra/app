import type { PermissionCondition } from '~/utils/types/permissions'

export const mockPermissionConditions: Record<string, PermissionCondition> = {
  // Public access - no permission required
  public: null,
  
  // Simple route permission
  simpleRead: {
    route: '/users',
    actions: ['read']
  },
  
  // Multiple actions
  fullAccess: {
    route: '/admin',
    actions: ['create', 'read', 'update', 'delete']
  },
  
  // AND condition
  adminUserManagement: {
    and: [
      { route: '/users', actions: ['read'] },
      { route: '/roles', actions: ['read'] }
    ]
  },
  
  // OR condition
  contentEditor: {
    or: [
      { route: '/posts', actions: ['create', 'update'] },
      { route: '/pages', actions: ['create', 'update'] }
    ]
  },
  
  // Complex nested condition
  superAdmin: {
    and: [
      { route: '/admin', actions: ['read'] },
      {
        or: [
          { route: '/users', actions: ['create', 'update', 'delete'] },
          { route: '/system', actions: ['read'] }
        ]
      }
    ]
  },
  
  // Menu specific permissions
  menuManagement: {
    and: [
      { route: '/menu_definition', actions: ['read'] },
      {
        or: [
          { route: '/menu_definition', actions: ['create'] },
          { route: '/menu_definition', actions: ['update'] },
          { route: '/menu_definition', actions: ['delete'] }
        ]
      }
    ]
  },
  
  // Table permissions
  tableAccess: {
    and: [
      { route: '/table_definition', actions: ['read'] },
      {
        or: [
          { route: '/table_definition', actions: ['create'] },
          { route: '/table_definition', actions: ['update'] },
          { route: '/table_definition', actions: ['delete'] }
        ]
      }
    ]
  }
}

// Mock user permissions for testing
export const mockUserPermissions = {
  admin: [
    { route: '/admin', actions: ['create', 'read', 'update', 'delete'] },
    { route: '/users', actions: ['create', 'read', 'update', 'delete'] },
    { route: '/roles', actions: ['create', 'read', 'update', 'delete'] },
    { route: '/menu_definition', actions: ['create', 'read', 'update', 'delete'] },
    { route: '/table_definition', actions: ['create', 'read', 'update', 'delete'] }
  ],
  
  editor: [
    { route: '/posts', actions: ['create', 'read', 'update'] },
    { route: '/pages', actions: ['create', 'read', 'update'] },
    { route: '/users', actions: ['read'] }
  ],
  
  viewer: [
    { route: '/posts', actions: ['read'] },
    { route: '/pages', actions: ['read'] },
    { route: '/users', actions: ['read'] }
  ],
  
  guest: []
}

// Mock route definitions for testing
export const mockRoutes = [
  { path: '/admin', name: 'admin' },
  { path: '/users', name: 'users' },
  { path: '/roles', name: 'roles' },
  { path: '/posts', name: 'posts' },
  { path: '/pages', name: 'pages' },
  { path: '/menu_definition', name: 'menu_definition' },
  { path: '/table_definition', name: 'table_definition' },
  { path: '/system', name: 'system' }
]