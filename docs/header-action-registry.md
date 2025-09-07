# Header Action Registry System

The Header Action Registry System provides a flexible, route-specific way to manage header actions (buttons) in the Enfyra App. This system allows each page to register its own actions, which are automatically displayed in the header and cleaned up when navigating away.

## Overview

The Header Action Registry replaces hardcoded header buttons with a dynamic, plugin-ready system. Actions are registered per-route and automatically managed based on the current page context.

## Core Concepts

### Header Action

A header action represents a button or interactive element displayed in the application header. Actions can be navigation links, form submissions, or custom handlers.

### Action Registry

The registry maintains a collection of actions for the current route, automatically clearing and re-registering actions as the user navigates.

### Route-Specific Actions

Each page can register its own actions, ensuring the header always displays relevant controls for the current context.

## Data Structure

### HeaderAction Interface

```typescript
interface HeaderAction {
  id: string;                    // Unique identifier for the action
  label?: string;                 // Button label (hidden on mobile/create buttons)
  icon: string;                   // Icon name (e.g., 'lucide:plus')
  variant?: 'solid' | 'outline' | 'ghost' | 'soft';  // Button style variant
  color?: 'primary' | 'secondary' | 'warning' | 'success' | 'info' | 'error' | 'neutral';
  size?: 'sm' | 'md' | 'lg' | 'xl';  // Button size
  loading?: boolean;              // Show loading state
  disabled?: boolean;             // Disable the button
  permission?: PermissionCondition;  // Permission requirements
  onClick?: () => void;           // Custom click handler
  to?: string;                    // Navigation route (for links)
  submit?: () => void;            // Form submission handler
  showOn?: string[];              // Routes where action should appear
  hideOn?: string[];              // Routes where action should be hidden
  class?: string;                 // Additional CSS classes
}
```

## Usage

### Basic Registration

Register an action in any page component using the `useHeaderActionRegistry` composable:

```vue
<script setup lang="ts">
// Register a create button
useHeaderActionRegistry({
  id: "create-user",
  label: "Create User",
  icon: "lucide:plus",
  variant: "solid",
  color: "primary",
  size: "lg",
  to: "/settings/users/create",
  class: "rounded-full"
});
</script>
```

### Form Submission Action

Register an action that submits a form:

```vue
<script setup lang="ts">
// Register a save button that calls a submit function
useHeaderActionRegistry({
  id: "save-user",
  label: "Save",
  icon: "lucide:save",
  variant: "solid",
  color: "primary",
  submit: save,  // Calls the save function when clicked
  loading: loading.value  // Shows loading state
});

async function save() {
  // Your save logic here
  await updateUser(formData);
}
</script>
```

### Custom Click Handler

Register an action with custom behavior:

```vue
<script setup lang="ts">
useHeaderActionRegistry({
  id: "export-data",
  label: "Export",
  icon: "lucide:download",
  variant: "outline",
  onClick: () => {
    // Custom export logic
    exportToCSV(data.value);
  }
});
</script>
```

### Permission-Protected Actions

Add permission requirements to actions:

```vue
<script setup lang="ts">
useHeaderActionRegistry({
  id: "delete-all",
  label: "Delete All",
  icon: "lucide:trash",
  variant: "soft",
  color: "error",
  onClick: deleteAll,
  permission: {
    or: [
      { route: "/users", actions: ["delete"] }
    ]
  }
});
</script>
```

### Conditional Display

Control when actions appear using `showOn` and `hideOn`:

```vue
<script setup lang="ts">
useHeaderActionRegistry({
  id: "bulk-edit",
  label: "Bulk Edit",
  icon: "lucide:edit",
  showOn: ["/data", "/settings/users"],  // Only show on these routes
  hideOn: ["/data/create"],  // Hide on create pages
  onClick: openBulkEditModal
});
</script>
```

## Implementation Examples

### List Page with Create Button

```vue
<!-- pages/settings/users/index.vue -->
<script setup lang="ts">
// Register create button for users list
useHeaderActionRegistry({
  id: "create-user",
  label: "Create User",
  icon: "lucide:plus",
  variant: "solid",
  color: "primary",
  size: "lg",
  to: "/settings/users/create",
  class: "rounded-full",
  permission: {
    or: [{ route: "/user_definition", actions: ["create"] }]
  }
});

// Fetch and display users...
</script>
```

### Edit Page with Save Button

```vue
<!-- pages/settings/users/[id].vue -->
<script setup lang="ts">
const { globalForm, globalFormLoading } = useGlobalState();

// Register save button
useHeaderActionRegistry({
  id: "save-user",
  label: "Save Changes",
  icon: "lucide:save",
  variant: "solid",
  color: "primary",
  submit: () => globalForm.value?.submit(),
  loading: globalFormLoading.value
});

// Form logic...
</script>
```

### Data Table with Multiple Actions

```vue
<!-- pages/data/[table]/index.vue -->
<script setup lang="ts">
const selectedRows = ref([]);

// Register multiple actions
useHeaderActionRegistry({
  id: "create-entry",
  icon: "lucide:plus",
  variant: "solid",
  color: "primary",
  size: "lg",
  to: `/data/${route.params.table}/create`,
  class: "rounded-full"
});

// Conditionally register bulk actions with watcher
watch(selectedRows, (rows) => {
  if (rows.length > 0) {
    useHeaderActionRegistry({
      id: "bulk-delete-data-entries", // Specific ID to avoid conflicts
      label: `Delete ${rows.length} items`,
      icon: "lucide:trash",
      variant: "soft",
      color: "error",
      onClick: () => bulkDelete(rows)
    });
  }
}, { immediate: true });
</script>
```

## Plugin Development

Plugins can register their own header actions:

### Plugin Example

```typescript
// plugins/analytics.client.ts
export default defineNuxtPlugin(() => {
  const route = useRoute();
  
  // Register analytics action for data pages
  if (route.path.startsWith('/data')) {
    const { register } = useHeaderActionRegistry();
    
    register({
      id: "view-analytics",
      label: "Analytics",
      icon: "lucide:bar-chart",
      variant: "outline",
      onClick: () => {
        // Open analytics modal
        openAnalyticsModal();
      }
    });
  }
});
```

### Advanced Plugin with Dynamic Actions

```typescript
// plugins/import-export.client.ts
export default defineNuxtPlugin(() => {
  const route = useRoute();
  const { register } = useHeaderActionRegistry();
  
  // Watch route changes
  watch(() => route.path, (path) => {
    if (path.startsWith('/data/')) {
      // Register import/export actions for data tables
      register({
        id: "import-data",
        label: "Import",
        icon: "lucide:upload",
        variant: "outline",
        onClick: () => openImportDialog()
      });
      
      register({
        id: "export-data",
        label: "Export",
        icon: "lucide:download",
        variant: "outline",
        onClick: () => openExportDialog()
      });
    }
  });
});
```

## Best Practices

### 1. Unique IDs

Always use unique, descriptive IDs for actions. **Duplicate IDs will overwrite existing actions**:

```typescript
// Good - descriptive and unique
id: "create-user"
id: "save-post-draft"
id: "export-csv-data"
id: "users-index-filter"
id: "settings-extensions-upload"

// Bad - generic and likely to conflict
id: "button1"
id: "action"
id: "btn"
id: "save"  // Too generic, will conflict across pages
```

**ID Naming Convention:**
- Use kebab-case
- Include context: `{page}-{action}` or `{feature}-{action}`
- Be specific: `save-user` not just `save`

### 2. Consistent Styling

Follow consistent patterns for similar actions:

```typescript
// Create buttons pattern
{
  icon: "lucide:plus",
  variant: "solid",
  color: "primary",
  size: "lg",
  class: "rounded-full"
}

// Save buttons pattern
{
  icon: "lucide:save",
  variant: "solid",
  color: "primary",
  label: "Save"
}

// Delete buttons pattern
{
  icon: "lucide:trash",
  variant: "soft",
  color: "error"
}
```

### 3. Label Management

- Create buttons: Usually no label (icon-only)
- Save/Update buttons: Include label on desktop
- Delete buttons: Always include label for clarity
- Mobile: Labels automatically hidden

### 4. Loading States

Bind loading states for async operations:

```vue
<script setup lang="ts">
const loading = ref(false);

useHeaderActionRegistry({
  id: "save-data",
  label: "Save",
  icon: "lucide:save",
  loading: loading.value,
  submit: async () => {
    loading.value = true;
    try {
      await saveData();
    } finally {
      loading.value = false;
    }
  }
});
</script>
```

### 5. Permission Checks

Always include permission checks for protected actions:

```typescript
useHeaderActionRegistry({
  id: "admin-action",
  label: "Admin Only",
  icon: "lucide:shield",
  permission: {
    or: [
      { route: "/admin", actions: ["read"] }
    ]
  },
  onClick: performAdminAction
});
```

## Common Pitfalls

### 1. Duplicate IDs
❌ **Wrong:** Multiple actions with same ID
```typescript
// Page A
useHeaderActionRegistry({ id: "save", ... });

// Page B  
useHeaderActionRegistry({ id: "save", ... }); // Overwrites Page A's action!
```

✅ **Correct:** Unique IDs per context
```typescript
// Page A
useHeaderActionRegistry({ id: "save-user-profile", ... });

// Page B
useHeaderActionRegistry({ id: "save-settings-config", ... });
```

### 2. Missing Reactive Loading States
❌ **Wrong:** Static loading value
```typescript
const loading = ref(false);
useHeaderActionRegistry({
  loading: loading.value, // Not reactive!
  submit: async () => { loading.value = true; }
});
```

✅ **Correct:** Reactive loading
```typescript
const loading = ref(false);
useHeaderActionRegistry({
  loading: computed(() => loading.value), // Reactive!
  submit: async () => { loading.value = true; }
});
```

### 3. Missing Cleanup
Actions are automatically cleaned up on route change, but for conditional actions:

❌ **Wrong:** No cleanup for conditional actions
```typescript
if (someCondition) {
  useHeaderActionRegistry({ id: "conditional-action", ... });
}
// Action remains if condition becomes false
```

✅ **Correct:** Use watchers for conditional logic
```typescript
watch(someCondition, (condition) => {
  if (condition) {
    useHeaderActionRegistry({ id: "conditional-action", ... });
  }
  // Auto-cleanup happens on route change
}, { immediate: true });
```

## Migration Guide

### From Hardcoded Headers

Before (in layout file):
```vue
<!-- layouts/default.vue -->
<div v-if="route.path.startsWith('/settings/users')">
  <UButton
    v-if="route.path === '/settings/users'"
    label="Create User"
    icon="lucide:plus"
    to="/settings/users/create"
  />
  <UButton
    v-else
    label="Save"
    icon="lucide:save"
    @click="save"
  />
</div>
```

After (in page files):
```vue
<!-- pages/settings/users/index.vue -->
<script setup>
useHeaderActionRegistry({
  id: "create-user",
  label: "Create User",
  icon: "lucide:plus",
  to: "/settings/users/create"
});
</script>

<!-- pages/settings/users/[id].vue -->
<script setup>
useHeaderActionRegistry({
  id: "save-user",
  label: "Save",
  icon: "lucide:save",
  submit: save
});
</script>
```

## Troubleshooting

### Action Not Appearing

1. Check the action ID is unique
2. Verify permission requirements
3. Check `showOn`/`hideOn` conditions
4. Ensure registration happens in `setup` phase

### Action Not Updating

Actions are cleared and re-registered on route changes. If an action needs to update dynamically:

```vue
<script setup>
const count = ref(0);

// Re-register when count changes
watch(count, () => {
  useHeaderActionRegistry({
    id: "dynamic-action",
    label: `Count: ${count.value}`,
    icon: "lucide:hash"
  });
});
</script>
```

### Multiple Actions Same ID

Only one action per ID is allowed. Later registrations will be ignored:

```typescript
// First registration wins
useHeaderActionRegistry({ id: "save", label: "Save 1" });  // ✓ Registered
useHeaderActionRegistry({ id: "save", label: "Save 2" });  // ✗ Ignored
```

## API Reference

### useHeaderActionRegistry

The main composable for registering header actions.

#### Signature

```typescript
function useHeaderActionRegistry(action?: HeaderAction): {
  headerActions: Ref<HeaderAction[]>;
  register: (action: HeaderAction) => void;
}
```

#### Parameters

- `action` (optional): HeaderAction to register immediately

#### Returns

- `headerActions`: Reactive array of current actions
- `register`: Function to register new actions

#### Example

```typescript
// Register immediately
useHeaderActionRegistry({
  id: "my-action",
  icon: "lucide:star",
  label: "My Action"
});

// Or use the register function
const { register } = useHeaderActionRegistry();
register({
  id: "my-action",
  icon: "lucide:star",
  label: "My Action"
});
```

## Summary

The Header Action Registry System provides:

1. **Dynamic Actions**: Route-specific header buttons
2. **Plugin Support**: Extensible architecture for plugins
3. **Type Safety**: Full TypeScript support
4. **Permission Integration**: Built-in permission checks
5. **Responsive Design**: Automatic mobile adaptations
6. **Clean Architecture**: Separation of concerns

This system is a cornerstone of Enfyra's plugin-ready architecture, enabling developers to create rich, context-aware interfaces without modifying core layout files.