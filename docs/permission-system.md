# Permission System - Usage Guide

The Enfyra App permission system provides comprehensive role-based access control (RBAC) for fine-grained control over user access. This system uses roles, routes, and actions to determine what users can see and do within the CMS.

## Core Concepts

### Permission Types

| Action   | HTTP Method | Description             |
|----------|-------------|-------------------------|
| `read`   | GET         | View data               |
| `create` | POST        | Create new records      |
| `update` | PATCH       | Modify existing records |
| `delete` | DELETE      | Remove records          |

### Permission Structure

```typescript
// Simple permission rule
type PermissionRule = {
  route: string;
  actions: string[];
};

// Complex permission condition
type PermissionCondition = {
  and?: (PermissionRule | PermissionCondition)[];
  or?: (PermissionRule | PermissionCondition)[];
  allowAll?: boolean;
};
```

### Common Routes

| Route                    | Description           | Common Actions                       |
|--------------------------|-----------------------|--------------------------------------|
| `/user_definition`       | User management       | `read`, `create`, `update`, `delete` |
| `/role_definition`       | Role management       | `read`, `create`, `update`, `delete` |
| `/extension_definition`  | Extension management  | `read`, `create`, `update`, `delete` |
| `/hook_definition`       | Hook management       | `read`, `create`, `update`, `delete` |
| `/menu_definition`       | Menu management       | `read`, `create`, `update`, `delete` |

## Components & Composables

### PermissionGate Component

The `PermissionGate` component provides declarative permission-based rendering:

```vue
<template>
  <!-- Simple permission check -->
  <PermissionGate :condition="{ or: [{ route: '/user_definition', actions: ['read'] }] }">
    <div>User content visible to users with read permission</div>
  </PermissionGate>

  <!-- Complex permission condition -->
  <PermissionGate :condition="{
    and: [
      { route: '/user_definition', actions: ['read'] },
      { route: '/role_definition', actions: ['read'] }
    ]
  }">
    <div>Content requiring both user and role read permissions</div>
  </PermissionGate>

  <!-- Multiple actions on same route -->
  <PermissionGate :condition="{ or: [{ route: '/user_definition', actions: ['create', 'update'] }] }">
    <UButton>Edit User</UButton>
  </PermissionGate>
</template>
```

#### Props

- `condition?: PermissionCondition` - Modern permission condition (recommended)
- `actions?: string[]` - Legacy: array of actions to check
- `routes?: string[]` - Legacy: array of routes to check  
- `mode?: "any" | "all"` - Legacy: permission checking mode

### usePermissions Composable

The `usePermissions` composable provides programmatic permission checking:

```vue
<script setup lang="ts">
const { hasPermission, checkPermissionCondition } = usePermissions();

// Check specific permission
const canCreateUsers = computed(() => {
  return hasPermission('/user_definition', 'POST');
});

// Check complex condition
const canManageUsers = computed(() => {
  return checkPermissionCondition({
    and: [
      { route: '/user_definition', actions: ['read', 'create'] },
      { route: '/role_definition', actions: ['read'] }
    ]
  });
});

// Use in functions
async function deleteUser(userId: string) {
  if (!hasPermission('/user_definition', 'DELETE')) {
    toast.add({
      title: 'Access Denied',
      description: 'You do not have permission to delete users',
      color: 'error'
    });
    return;
  }

  await deleteUserAPI(userId);
}
</script>
```

#### Methods

- `hasPermission(route: string, method: string): boolean` - Check specific route/method permission
- `checkPermissionCondition(condition: PermissionCondition): boolean` - Check complex condition
- `hasAnyPermission(routes: string[], actions: string[]): boolean` - Legacy method
- `hasAllPermissions(routes: string[], actions: string[]): boolean` - Legacy method

## Usage Patterns

### 1. Menu Registration

```typescript
// Register menu item with permission
registerMenuItem({
  id: 'users',
  label: 'Users',
  route: '/settings/users',
  sidebarId: 'settings',
  permission: { or: [{ route: '/user_definition', actions: ['read'] }] },
  order: 1
});
```

### 2. Header Actions

```vue
<script setup lang="ts">
// Register header action with permission check
useHeaderActionRegistry({
  id: 'create-user',
  label: 'Create User',
  icon: 'lucide:plus',
  variant: 'solid',
  color: 'primary',
  to: '/settings/users/create',
  permission: {
    and: [
      { route: '/user_definition', actions: ['create'] }
    ]
  }
});
</script>
```

### 3. Conditional UI Elements

```vue
<template>
  <!-- Show/hide buttons based on permissions -->
  <div class="flex gap-2">
    <PermissionGate :condition="{ or: [{ route: '/user_definition', actions: ['create'] }] }">
      <UButton @click="createUser">Create User</UButton>
    </PermissionGate>
    
    <PermissionGate :condition="{ or: [{ route: '/user_definition', actions: ['delete'] }] }">
      <UButton color="red" @click="deleteUsers">Delete Selected</UButton>
    </PermissionGate>
  </div>

  <!-- Conditional rendering in table actions -->
  <template v-for="user in users" :key="user.id">
    <div class="user-row">
      <span>{{ user.name }}</span>
      <div class="actions">
        <PermissionGate :condition="{ or: [{ route: '/user_definition', actions: ['update'] }] }">
          <UButton @click="editUser(user.id)">Edit</UButton>
        </PermissionGate>
        <PermissionGate :condition="{ or: [{ route: '/user_definition', actions: ['delete'] }] }">
          <UButton color="red" @click="deleteUser(user.id)">Delete</UButton>
        </PermissionGate>
      </div>
    </div>
  </template>
</template>
```

### 4. Form Validation

```vue
<script setup lang="ts">
const { validate } = useSchema(tableName);
const { hasPermission } = usePermissions();

async function handleSubmit() {
  // Check permission before processing
  if (!hasPermission(`/${tableName}`, 'POST')) {
    toast.add({
      title: 'Access Denied',
      description: 'You do not have permission to create records',
      color: 'error'
    });
    return;
  }

  const { isValid, errors } = validate(formData.value);
  
  if (!isValid) {
    formErrors.value = errors;
    return;
  }

  await executeCreate({ body: formData.value });
}
</script>
```

### 5. Complex Permission Scenarios

```vue
<script setup lang="ts">
// Admin panel access - must have admin permissions OR be root admin
const showAdminPanel = computed(() => {
  return checkPermissionCondition({
    or: [
      { route: '/admin', actions: ['read'] },
      { allowAll: true } // For root admin
    ]
  });
});

// Content management - must have both read and write permissions
const canManageContent = computed(() => {
  return checkPermissionCondition({
    and: [
      { route: '/extension_definition', actions: ['read'] },
      { route: '/extension_definition', actions: ['create', 'update'] }
    ]
  });
});

// Multiple route access - user can access if they have permission for ANY of these routes
const canAccessSettings = computed(() => {
  return checkPermissionCondition({
    or: [
      { route: '/user_definition', actions: ['read'] },
      { route: '/role_definition', actions: ['read'] },
      { route: '/menu_definition', actions: ['read'] },
      { route: '/extension_definition', actions: ['read'] }
    ]
  });
});
</script>
```

## Permission Examples by Feature

### User Management

```vue
<template>
  <!-- User list page -->
  <PermissionGate :condition="{ or: [{ route: '/user_definition', actions: ['read'] }] }">
    <DataTable :data="users" :columns="userColumns" />
  </PermissionGate>

  <!-- Create button -->  
  <PermissionGate :condition="{ or: [{ route: '/user_definition', actions: ['create'] }] }">
    <UButton to="/settings/users/create">Create User</UButton>
  </PermissionGate>
</template>
```

### Role Management

```vue
<template>
  <!-- Role assignment -->
  <PermissionGate :condition="{ or: [{ route: '/role_definition', actions: ['update'] }] }">
    <USelect v-model="selectedRole" :options="roleOptions" />
  </PermissionGate>
</template>
```

### Extension System

```vue
<template>
  <!-- Extension list -->
  <PermissionGate :condition="{ or: [{ route: '/extension_definition', actions: ['read'] }] }">
    <div v-for="extension in extensions" :key="extension.id">
      {{ extension.name }}
      
      <!-- Enable/disable extension -->
      <PermissionGate :condition="{ or: [{ route: '/extension_definition', actions: ['update'] }] }">
        <UToggle v-model="extension.enabled" @update:model-value="toggleExtension" />
      </PermissionGate>
      
      <!-- Delete extension -->
      <PermissionGate :condition="{ or: [{ route: '/extension_definition', actions: ['delete'] }] }">
        <UButton color="red" @click="deleteExtension(extension.id)">Delete</UButton>
      </PermissionGate>
    </div>
  </PermissionGate>
</template>
```

## Best Practices

### 1. Permission Design

✅ **Use specific route names that match your API endpoints**
```typescript
// Good - matches actual API routes
{ route: '/user_definition', actions: ['read'] }
{ route: '/role_definition', actions: ['create'] }

// Bad - generic or non-existent routes
{ route: '/users', actions: ['read'] }
{ route: '/admin', actions: ['all'] }
```

✅ **Combine related permissions logically**
```typescript
// Good - logical grouping
{
  and: [
    { route: '/user_definition', actions: ['read'] },
    { route: '/role_definition', actions: ['read'] }
  ]
}

// Bad - unrelated permissions
{
  and: [
    { route: '/user_definition', actions: ['create'] },
    { route: '/extension_definition', actions: ['delete'] }
  ]
}
```

### 2. Component Usage

✅ **Use PermissionGate for UI elements**
```vue
<!-- Good - wrap UI elements -->
<PermissionGate :condition="{ or: [{ route: '/user_definition', actions: ['create'] }] }">
  <UButton>Create User</UButton>
</PermissionGate>
```

✅ **Use usePermissions for business logic**
```typescript
// Good - programmatic checks
if (hasPermission('/user_definition', 'DELETE')) {
  await deleteUser(userId);
}
```

### 3. Performance

✅ **Cache permission results in computed properties**
```vue
<script setup lang="ts">
const canManageUsers = computed(() => {
  return checkPermissionCondition({
    and: [
      { route: '/user_definition', actions: ['read', 'update'] }
    ]
  });
});
</script>
```

✅ **Use specific permissions rather than broad checks**
```typescript
// Good - specific permission
hasPermission('/user_definition', 'POST')

// Avoid - checking multiple permissions unnecessarily
hasAnyPermission(['/user_definition', '/role_definition'], ['create'])
```

### 4. Security

✅ **Always check permissions on both client and server side**
```vue
<script setup lang="ts">
// Client-side check for UI
const canDelete = hasPermission('/user_definition', 'DELETE');

// Server-side validation happens automatically in API calls
async function deleteUser(id: string) {
  if (!canDelete) return;
  
  // API will also validate permissions server-side
  await $fetch(`/api/user_definition/${id}`, { method: 'DELETE' });
}
</script>
```

✅ **Use allowAll sparingly and only for special cases**
```typescript
// Good - specific use case
{ allowAll: true } // Only for root admin bypass

// Bad - overuse
{ allowAll: true } // Don't use as default fallback
```

## Common Pitfalls

### 1. Wrong Route Names
❌ **Wrong:** Using display names instead of API routes
```typescript
// Wrong - these don't match actual API routes
{ route: '/users', actions: ['read'] }
{ route: '/settings', actions: ['read'] }
```

✅ **Correct:** Use actual API endpoint routes
```typescript
// Correct - matches API endpoints
{ route: '/user_definition', actions: ['read'] }
{ route: '/extension_definition', actions: ['read'] }
```

### 2. Missing Permission Checks
❌ **Wrong:** No permission validation before actions
```vue
<UButton @click="deleteUser">Delete</UButton>
```

✅ **Correct:** Always wrap actions with permission checks
```vue
<PermissionGate :condition="{ or: [{ route: '/user_definition', actions: ['delete'] }] }">
  <UButton @click="deleteUser">Delete</UButton>
</PermissionGate>
```

### 3. Overly Complex Conditions
❌ **Wrong:** Unnecessary complexity
```typescript
// Overly complex
{
  and: [
    {
      or: [
        { route: '/user_definition', actions: ['read'] },
        { route: '/user_definition', actions: ['create'] }
      ]
    },
    {
      or: [
        { route: '/role_definition', actions: ['read'] }
      ]
    }
  ]
}
```

✅ **Correct:** Simplify conditions
```typescript
// Simplified
{
  and: [
    { route: '/user_definition', actions: ['read', 'create'] },
    { route: '/role_definition', actions: ['read'] }
  ]
}
```

## Debugging

### Check Current User Permissions

```vue
<script setup lang="ts">
const { me } = useAuth();
const { hasPermission } = usePermissions();

// Debug current user
console.log('Current user:', me.value);
console.log('Is root admin:', me.value?.isRootAdmin);
console.log('User role:', me.value?.role);
console.log('Route permissions:', me.value?.role?.routePermissions);

// Test specific permission
console.log('Can read users:', hasPermission('/user_definition', 'GET'));
console.log('Can create users:', hasPermission('/user_definition', 'POST'));
console.log('Can update users:', hasPermission('/user_definition', 'PATCH'));
console.log('Can delete users:', hasPermission('/user_definition', 'DELETE'));
</script>
```

### Debug Permission Conditions

```vue
<script setup lang="ts">
const { checkPermissionCondition } = usePermissions();

// Test complex condition
const condition = {
  and: [
    { route: '/user_definition', actions: ['read'] },
    { route: '/role_definition', actions: ['read'] }
  ]
};

const hasAccess = checkPermissionCondition(condition);
console.log('Has access to condition:', hasAccess);

// Break down condition testing
console.log('User read permission:', hasPermission('/user_definition', 'GET'));
console.log('Role read permission:', hasPermission('/role_definition', 'GET'));
</script>
```

## Troubleshooting

### Common Issues

1. **Permission not working**
   - Check if user has correct role assigned
   - Verify route permission is enabled in role settings
   - Ensure route path matches exactly (check API endpoint)
   - Verify user role is active

2. **Menu items not showing**
   - Check permission condition syntax
   - Verify user has required permissions
   - Check browser console for JavaScript errors
   - Ensure menu item route matches permission route

3. **API access denied**
   - Verify HTTP method is included in role permissions
   - Check if route is enabled in system settings
   - Ensure user session is valid
   - Check server logs for detailed error messages

### Quick Fixes

```vue
<script setup lang="ts">
const { me, fetchUser } = useAuth();

// Force refresh user permissions
async function refreshPermissions() {
  await fetchUser();
  console.log('Permissions refreshed');
}

// Check if user is logged in
if (!me.value) {
  console.log('User not logged in');
}

// Check if user is root admin
if (me.value?.isRootAdmin) {
  console.log('User is root admin - has all permissions');
}
</script>
```

## Summary

The Enfyra App permission system provides:

1. **PermissionGate Component** - Declarative permission-based rendering
2. **usePermissions Composable** - Programmatic permission checking  
3. **Flexible Conditions** - AND/OR logic for complex scenarios
4. **Type Safety** - Full TypeScript support
5. **Integration** - Works with menu system, header actions, and API calls

Use `PermissionGate` for UI elements and `usePermissions` for business logic. Always match route names to actual API endpoints and follow the principle of least privilege when designing roles.