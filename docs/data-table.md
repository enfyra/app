# DataTable Component

The DataTable component is a powerful, feature-rich table component built on top of @tanstack/vue-table with enhanced functionality for modern data display and interaction.

## Overview

DataTable provides a consistent interface for displaying tabular data with support for:

- Sorting and column visibility
- Bulk selection and operations
- Context menus for row actions
- Responsive design (desktop table / tablet cards)
- Loading states and empty states
- Pagination integration

## Props

```typescript
interface DataTableProps {
  data: any[];
  columns: any[]; // TanStack Table ColumnDef compatible
  pageSize?: number;
  loading?: boolean;
  selectable?: boolean;
  contextMenuItems?: (row: any) => any[];
}
```

### Props Details

| Prop               | Type                  | Default     | Description                           |
| ------------------ | --------------------- | ----------- | ------------------------------------- |
| `data`             | `any[]`               | Required    | Array of data objects to display      |
| `columns`          | `any[]`               | Required    | TanStack Table column definitions     |
| `pageSize`         | `number`              | `10`        | Number of items per page              |
| `loading`          | `boolean`             | `false`     | Shows loading state                   |
| `selectable`       | `boolean`             | `false`     | Enables row selection checkboxes      |
| `contextMenuItems` | `(row: any) => any[]` | `undefined` | Function returning context menu items |

## Events

| Event         | Payload               | Description                           |
| ------------- | --------------------- | ------------------------------------- |
| `row-click`   | `row: any`            | Emitted when a row is clicked         |
| `bulk-delete` | `selectedRows: any[]` | Emitted when bulk delete is triggered |

## Basic Usage

### Simple Table

```vue
<template>
  <DataTable
    :data="users"
    :columns="userColumns"
    :loading="loading"
    @row-click="handleUserClick"
  />
</template>

<script setup lang="ts">
const users = ref([
  { id: 1, name: "John Doe", email: "john@example.com" },
  { id: 2, name: "Jane Smith", email: "jane@example.com" },
]);

const { useDataTableColumns } = props.components;
const { buildColumn } = useDataTableColumns();

const userColumns = computed(() => [
  buildColumn({
    id: "name",
    header: "Name",
    accessorKey: "name",
  }),
  buildColumn({
    id: "email",
    header: "Email",
    accessorKey: "email",
  }),
]);

function handleUserClick(user: any) {
  navigateTo(`/users/${user.id}`);
}
</script>
```

### Table with Selection

```vue
<template>
  <DataTable
    :data="items"
    :columns="columns"
    :selectable="true"
    @bulk-delete="handleBulkDelete"
    @row-click="handleRowClick"
  />
</template>

<script setup lang="ts">
const { useDataTableColumns } = props.components;
const { buildColumn } = useDataTableColumns();

const columns = computed(() => [
  buildColumn({
    id: "name",
    header: "Name",
    accessorKey: "name",
  }),
  buildColumn({
    id: "email",
    header: "Email",
    accessorKey: "email",
  }),
]);

function handleBulkDelete(selectedItems: any[]) {
  // Handle bulk delete operation
  console.log("Deleting items:", selectedItems);
}
</script>
```

## Advanced Features

### Context Menu Integration

DataTable supports right-click context menus for enhanced user interaction:

```vue
<template>
  <DataTable
    :data="files"
    :columns="fileColumns"
    :context-menu-items="getContextMenuItems"
    @row-click="handleFileClick"
  />
</template>

<script setup lang="ts">
const { useDataTableColumns } = props.components;
const { buildColumn } = useDataTableColumns();

const fileColumns = computed(() => [
  buildColumn({
    id: "filename",
    header: "Filename",
    accessorKey: "filename",
  }),
  buildColumn({
    id: "filesize",
    header: "Size",
    accessorKey: "filesize",
  }),
  buildColumn({
    id: "isPublished",
    header: "Status",
    accessorKey: "isPublished",
  }),
]);

function getContextMenuItems(file: any) {
  const menuItems = [
    [
      {
        label: "View",
        icon: "lucide:eye",
        onSelect: () => viewFile(file),
      },
      {
        label: "Download",
        icon: "lucide:download",
        onSelect: () => downloadFile(file),
      },
      {
        label: "Copy URL",
        icon: "lucide:copy",
        onSelect: () => copyFileUrl(file),
      },
    ],
  ];

  // Permission-based actions
  if (canDeleteFile) {
    menuItems.push([
      {
        label: "Delete",
        icon: "lucide:trash-2",
        color: "error" as const,
        onSelect: () => deleteFile(file),
      },
    ]);
  }

  return menuItems;
}
</script>
```

### Custom Column Rendering

```vue
<script setup lang="ts">
const { useDataTableColumns } = props.components;
const { buildColumn } = useDataTableColumns();

const columns = computed(() => [
  buildColumn({
    id: "avatar",
    header: "",
    cell: ({ row }) => {
      const user = row.original;
      return h("div", { class: "flex items-center gap-3" }, [
        h("img", {
          src: user.avatar,
          class: "w-8 h-8 rounded-full",
          alt: user.name,
        }),
        h("span", { class: "font-medium" }, user.name),
      ]);
    },
  }),
  buildColumn({
    id: "status",
    header: "Status",
    cell: ({ getValue }) => {
      const status = getValue() as string;
      const colorMap = {
        active: "green",
        inactive: "red",
        pending: "yellow",
      };
      return h(
        "span",
        {
          class: `px-2 py-1 rounded text-xs bg-${colorMap[status]}-100 text-${colorMap[status]}-800`,
        },
        status
      );
    },
  }),
]);
</script>
```

### Actions Column

```vue
<script setup lang="ts">
const { useDataTableColumns } = props.components;
const { buildColumn, buildActionsColumn } = useDataTableColumns();

const columns = computed(() => [
  buildColumn({
    id: "name",
    header: "Name",
    accessorKey: "name",
  }),
  buildColumn({
    id: "email",
    header: "Email",
    accessorKey: "email",
  }),
  buildActionsColumn({
    width: 60,
    actions: [
      {
        label: "Edit",
        icon: "i-lucide-edit",
        onSelect: (item) => editItem(item),
      },
      {
        label: "Delete",
        icon: "i-lucide-trash-2",
        color: "error" as const,
        onSelect: (item) => deleteItem(item),
      },
    ],
  }),
]);
</script>
```

## Responsive Behavior

DataTable automatically adapts to different screen sizes:

- **Desktop**: Full table layout with all columns
- **Tablet**: Card-based layout using `DataTableTabletCard`
- **Mobile**: Handled by parent component (typically switches to grid view)

The responsive breakpoint is controlled by the `useScreen` composable's `isTablet` property.

## Loading States

```vue
<template>
  <DataTable :data="data" :columns="columns" :loading="pending" />
</template>

<script setup lang="ts">
const { data, pending } = await useApiLazy(() => "/api/users");
</script>
```

The loading state shows a `LoadingState` component with table-specific styling.

## Empty States

When no data is available, DataTable displays a `EmptyState` component:

```vue
<!-- Automatically shown when data.length === 0 -->
<EmptyState
  title="No data available"
  description="There are no records to display"
  icon="lucide:database"
  size="sm"
/>
```

## Integration with useApiLazy

DataTable works seamlessly with the `useApiLazy` composable:

```vue
<script setup lang="ts">
const { data, pending, execute } = useApiLazy(() => "/api/users", {
  query: {
    limit: 20,
    page: 1,
    sort: "-createdAt",
  },
});

// Transform data for table
const tableData = computed(() => data.value?.data || []);
</script>
```

## Best Practices

### 1. Column Definition

- **Always use `useDataTableColumns` composable** for consistent column building
- Use descriptive `id` values for columns
- Provide proper `header` text for accessibility
- Use `accessorKey` for simple field access
- Use `cell` function for custom rendering

```vue
<script setup lang="ts">
const { useDataTableColumns } = props.components;
const { buildColumn } = useDataTableColumns();

// ✅ Good - Using composable
const columns = computed(() => [
  buildColumn({
    id: "user-name",
    header: "Full Name",
    accessorKey: "name",
  }),
]);

// ❌ Avoid - Raw column objects
const columns = [
  {
    id: "col1",
    header: "",
    accessorKey: "name",
  },
];
</script>
```

### 2. Context Menu Design

- Group related actions together
- Use descriptive labels and appropriate icons
- Implement permission-based visibility
- Use consistent action patterns across the app

```vue
<script setup lang="ts">
// ✅ Good - Grouped actions with permissions
function getContextMenuItems(item: any) {
  const menuItems = [
    // Primary actions
    [
      { label: "View", icon: "lucide:eye", onSelect: () => view(item) },
      { label: "Edit", icon: "lucide:edit", onSelect: () => edit(item) },
    ],
  ];

  // Destructive actions (conditional)
  if (canDelete) {
    menuItems.push([
      {
        label: "Delete",
        icon: "lucide:trash-2",
        color: "error",
        onSelect: () => delete item,
      },
    ]);
  }

  return menuItems;
}
</script>
```

### 3. Performance Optimization

- Use `pageSize` to limit rendered rows
- Implement server-side pagination for large datasets
- **Always use `computed` with `useDataTableColumns` composable**
- Avoid inline functions in templates
- Avoid recreating column objects on every render

```vue
<script setup lang="ts">
const { useDataTableColumns } = props.components;
const { buildColumn } = useDataTableColumns();

// ✅ Good - Computed columns with composable
const columns = computed(() => [
  buildColumn({
    id: "name",
    header: "Name",
    accessorKey: "name",
  }),
  buildColumn({
    id: "email",
    header: "Email",
    accessorKey: "email",
  }),
]);

// ❌ Avoid - Inline column definition
// :columns="[{ id: 'name', header: 'Name' }]"

// ❌ Avoid - Non-computed columns
const columns = [
  buildColumn({ id: "name", header: "Name", accessorKey: "name" }),
];
</script>
```

### 4. Accessibility

- Provide meaningful headers
- Use proper ARIA labels
- Ensure keyboard navigation works
- Test with screen readers

### 5. Error Handling

```vue
<script setup lang="ts">
const { data, error, pending } = useApiLazy(() => "/api/data");

// Handle errors gracefully
const tableData = computed(() => {
  if (error.value) return [];
  return data.value?.data || [];
});
</script>
```

## Common Patterns

### File Management Table

```vue
<template>
  <DataTable
    :data="files"
    :columns="fileColumns"
    :context-menu-items="getFileContextMenu"
    :selectable="true"
    @row-click="(file) => navigateTo(`/files/${file.id}`)"
    @bulk-delete="handleBulkDelete"
  />
</template>

<script setup lang="ts">
import {
  buildColumn,
  buildActionsColumn,
} from "~/composables/useDataTableColumns";

const fileColumns = computed(() => [
  buildColumn({
    id: "filename",
    header: "Filename",
    accessorKey: "filename",
  }),
  buildColumn({
    id: "filesize",
    header: "Size",
    accessorKey: "filesize",
  }),
  buildColumn({
    id: "isPublished",
    header: "Status",
    accessorKey: "isPublished",
  }),
  buildActionsColumn({
    width: 60,
    actions: [
      {
        label: "View",
        icon: "i-lucide-eye",
        onSelect: (file) => navigateTo(`/files/${file.id}`),
      },
      {
        label: "Download",
        icon: "i-lucide-download",
        onSelect: (file) => downloadFile(file),
      },
    ],
  }),
]);
</script>
```

### Settings Management Table

```vue
<template>
  <DataTable
    :data="settings"
    :columns="settingsColumns"
    :loading="pending"
    @row-click="
      (setting) => navigateTo(`/settings/${setting.type}/${setting.id}`)
    "
  />
</template>

<script setup lang="ts">
const { useDataTableColumns } = props.components;
const { buildColumn } = useDataTableColumns();

const settingsColumns = computed(() => [
  buildColumn({
    id: "name",
    header: "Name",
    accessorKey: "name",
  }),
  buildColumn({
    id: "type",
    header: "Type",
    accessorKey: "type",
  }),
  buildColumn({
    id: "isActive",
    header: "Status",
    accessorKey: "isActive",
  }),
]);
</script>
```

### User Management Table

```vue
<template>
  <DataTable
    :data="users"
    :columns="userColumns"
    :context-menu-items="getUserContextMenu"
    :selectable="canBulkEdit"
    @row-click="viewUser"
    @bulk-delete="handleBulkUserDelete"
  />
</template>

<script setup lang="ts">
const { useDataTableColumns } = props.components;
const { buildColumn, buildActionsColumn } = useDataTableColumns();

const userColumns = computed(() => [
  buildColumn({
    id: "name",
    header: "Name",
    accessorKey: "name",
  }),
  buildColumn({
    id: "email",
    header: "Email",
    accessorKey: "email",
  }),
  buildColumn({
    id: "role",
    header: "Role",
    accessorKey: "role.name",
  }),
  buildActionsColumn({
    width: 60,
    actions: [
      {
        label: "Edit",
        icon: "i-lucide-edit",
        onSelect: (user) => editUser(user),
      },
      {
        label: "Delete",
        icon: "i-lucide-trash-2",
        color: "error" as const,
        onSelect: (user) => deleteUser(user),
      },
    ],
  }),
]);
</script>
```

## useDataTableColumns Composable

The `useDataTableColumns` composable provides helper functions to build table columns consistently:

> **Note**: In dynamic components, `useDataTableColumns` is available through `props.components.useDataTableColumns()`. All examples in this documentation assume you're using the dynamic component system.

### Available Functions

#### `buildColumn(options)`

Creates a standard table column with common options:

```typescript
interface ColumnOptions {
  id: string;
  header: string;
  accessorKey?: string;
  cell?: (props: any) => any;
  width?: number;
  sortable?: boolean;
  hidden?: boolean;
}

const column = buildColumn({
  id: "name",
  header: "Name",
  accessorKey: "name",
  width: 200,
  sortable: true,
});
```

#### `buildActionsColumn(options)`

Creates an actions column with predefined action buttons:

```typescript
interface ActionsColumnOptions {
  width?: number;
  actions: Array<{
    label: string;
    icon: string;
    color?: "primary" | "secondary" | "success" | "warning" | "error";
    onSelect: (item: any) => void;
  }>;
}

const actionsColumn = buildActionsColumn({
  width: 60,
  actions: [
    {
      label: "Edit",
      icon: "i-lucide-edit",
      onSelect: (item) => editItem(item),
    },
    {
      label: "Delete",
      icon: "i-lucide-trash-2",
      color: "error",
      onSelect: (item) => deleteItem(item),
    },
  ],
});
```

### Usage Pattern

```vue
<script setup lang="ts">
const { useDataTableColumns } = props.components;
const { buildColumn, buildActionsColumn } = useDataTableColumns();

const columns = computed(() => [
  // Basic columns
  buildColumn({
    id: "id",
    header: "ID",
    accessorKey: "id",
    width: 80,
  }),
  buildColumn({
    id: "name",
    header: "Name",
    accessorKey: "name",
    sortable: true,
  }),

  // Custom cell rendering
  buildColumn({
    id: "status",
    header: "Status",
    cell: ({ getValue }) => {
      const status = getValue();
      return h('span', {
        class: `px-2 py-1 rounded text-xs bg-${status === 'active' ? 'green' : 'red'}-100`
      }, status);
    },
  }),

  // Actions column
  buildActionsColumn({
    width: 80,
    actions: [
      {
        label: "View",
        icon: "i-lucide-eye",
        onSelect: (item) => viewItem(item),
      }),
    ],
  }),
]);
</script>
```

## Related Components

- **DataTableTabletCard** - Card layout for tablet view (internal component)
- **DataTableBulkActions** - Bulk operation controls (internal component)
- **LoadingState** - Loading state component (internal component)
- **EmptyState** - Empty state component (internal component)

For comprehensive documentation on related systems:

- [API Composables Guide](./api-composables.md) - Data fetching patterns used with DataTable
- [Permission System](./permission-system.md) - Permission-based actions and context menus
- [Header Action Registry](./header-action-registry.md) - Header actions that complement table functionality

## Troubleshooting

### Context Menu Not Appearing

- Ensure `contextMenuItems` prop is provided
- Check that the function returns a non-empty array
- Verify menu item structure matches expected format

### Performance Issues

- Reduce `pageSize` for large datasets
- Implement server-side pagination
- Use `v-memo` for expensive cell renderers
- Consider virtual scrolling for very large tables

### Styling Issues

- Check responsive breakpoints
- Verify Tailwind classes are available
- Use browser dev tools to inspect rendered HTML
- Test on different screen sizes
