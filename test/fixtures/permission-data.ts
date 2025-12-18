import type { PermissionCondition } from '~/utils/types/permissions'

export const mockPermissionConditions: Record<string, PermissionCondition> = {
  public: null,
  
  simpleRead: {
    route: '/users',
    actions: ['read']
  },
  
  fullAccess: {
    route: '/admin',
    actions: ['create', 'read', 'update', 'delete']
  },
  
  adminUserManagement: {
    and: [
      { route: '/users', actions: ['read'] },
      { route: '/roles', actions: ['read'] }
    ]
  },
  
  contentEditor: {
    or: [
      { route: '/posts', actions: ['create', 'update'] },
      { route: '/pages', actions: ['create', 'update'] }
    ]
  },
  
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