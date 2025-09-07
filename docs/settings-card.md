# SettingsCard Component

Reusable card component for settings pages with consistent styling and flexible configuration.

## Features

- ✅ **Consistent Design**: Unified look across all settings pages
- ✅ **Tablet Optimized**: Responsive hover effects and proper sizing
- ✅ **Flexible Props**: Customizable icon, colors, stats, and actions
- ✅ **Header Actions**: Support for interactive controls in card header
- ✅ **Multiple Values**: Display multiple components for a single stat label
- ✅ **Slot Support**: Custom body content and footer
- ✅ **TypeScript**: Full type safety with intelligent auto-completion

## Basic Usage

```vue
<SettingsCard
  title="Role Name"
  description="Role description"
  icon="lucide:shield-check"
  icon-color="primary"
  :stats="[
    { label: 'Created', value: '2024-01-15' }
  ]"
  :actions="[
    {
      label: 'View Details',
      props: { icon: 'lucide:eye', variant: 'outline', size: 'sm' },
      to: '/settings/roles/123',
      block: true
    }
  ]"
/>
```

## Advanced Usage

### With Header Actions

```vue
<SettingsCard
  title="Menu Item"
  description="Dashboard Extension"
  icon="lucide:navigation"
  icon-color="primary"
  :header-actions="[
    {
      component: 'USwitch',
      props: { 'model-value': item.isEnabled },
      onClick: (e) => e?.stopPropagation(),
      onUpdate: (value) => toggleEnabled(item, value)
    },
    {
      component: 'UButton',
      props: { icon: 'i-heroicons-trash', variant: 'outline', color: 'error' },
      onClick: (e) => {
        e?.stopPropagation();
        deleteItem(item);
      }
    }
  ]"
/>
```

### With Multiple Values per Stat

```vue
<SettingsCard
  title="API Route"
  description="/api/users"
  icon="lucide:route"
  :stats="[
    {
      label: 'Methods',
      component: 'UBadge',
      values: [
        { value: 'GET', props: { color: 'info' } },
        { value: 'POST', props: { color: 'success' } },
        { value: 'DELETE', props: { color: 'error' } }
      ]
    }
  ]"
/>
```

### With Custom Slots

```vue
<SettingsCard
  title="User Name"
  description="user@example.com"
  icon="lucide:user"
  icon-color="success"
>
  <!-- Custom body content -->
  <div class="custom-content">
    <!-- Your custom content here -->
  </div>
  
  <!-- Custom footer -->
  <template #footer>
    <div class="flex gap-2">
      <UButton size="sm" variant="outline">Custom Action</UButton>
    </div>
  </template>
</SettingsCard>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | - | Card title (required) |
| `description` | `string` | - | Card subtitle/description |
| `icon` | `string` | - | Icon name (lucide format) |
| `iconColor` | `'primary' \| 'success' \| 'warning' \| 'error' \| 'neutral'` | `'primary'` | Icon color theme |
| `stats` | `Stat[]` | `[]` | Array of statistics to display |
| `actions` | `Action[]` | `[]` | Array of action buttons in footer |
| `headerActions` | `HeaderAction[]` | `[]` | Array of interactive components in header |
| `cardClass` | `string` | `''` | Additional CSS classes for card |

## Stat Interface

```typescript
interface Stat {
  label: string;
  value?: string | number;
  values?: Array<{              // For multiple components with same label
    value: string | number;
    props?: Record<string, any>;
  }>;
  component?: any;              // Component to render (e.g., 'UBadge')
  props?: Record<string, any>;  // Default props for all components
}
```

**Note:** Use either `value` for a single item or `values` for multiple items, not both.

## Action Interface

```typescript
interface Action {
  label: string;
  props?: Record<string, any>; // UButton props
  to?: string;                 // Navigation route
  onClick?: () => void;        // Click handler
  loading?: boolean;           // Loading state
  disabled?: boolean;          // Disabled state
  block?: boolean;             // Full width button
}
```

## HeaderAction Interface

```typescript
interface HeaderAction {
  component?: string;           // Component name (e.g., 'USwitch', 'UButton')
  props?: Record<string, any>;  // Component props
  label?: string;               // Optional label for the component
  onClick?: (e?: Event) => void;     // Click handler
  onUpdate?: (value: any) => void;   // Update handler for v-model components
}
```

## Examples

### Role Card
```vue
<SettingsCard
  title="Admin Role"
  description="Full system access"
  icon="lucide:shield-check"
  icon-color="primary"
  :stats="[
    { label: 'Created', value: '2024-01-15' },
    { label: 'Users', value: '5' }
  ]"
  :actions="[
    { label: 'Edit', props: { variant: 'outline', size: 'sm' }, to: '/edit' },
    { label: 'Delete', props: { variant: 'outline', color: 'error', size: 'sm' }, onClick: deleteRole }
  ]"
/>
```

### Extension Card
```vue
<SettingsCard
  title="Custom Extension"
  description="API integration module"
  icon="lucide:puzzle"
  icon-color="warning"
  :stats="[
    { 
      label: 'Status', 
      component: 'UBadge',
      props: { color: 'success', variant: 'soft' },
      value: 'Active'
    }
  ]"
  :actions="[
    { label: 'Configure', props: { variant: 'solid', size: 'sm' }, to: '/configure', block: true }
  ]"
/>
```

### Route Card with Multiple Methods
```vue
<SettingsCard
  title="/api/users"
  description="User management endpoint"
  icon="lucide:route"
  icon-color="primary"
  :stats="[
    {
      label: 'Methods',
      component: 'UBadge',
      values: [
        { value: 'GET', props: { color: 'info' } },
        { value: 'POST', props: { color: 'success' } },
        { value: 'PATCH', props: { color: 'warning' } },
        { value: 'DELETE', props: { color: 'error' } }
      ]
    },
    { label: 'Status', value: 'Enabled' }
  ]"
  :header-actions="[
    {
      component: 'USwitch',
      props: { 'model-value': true },
      onUpdate: (value) => console.log('Toggle:', value)
    }
  ]"
/>
```

## Grid Layout Integration

Use with responsive grid for tablet optimization:

```vue
<div 
  class="grid gap-4"
  :class="isTablet ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'"
>
  <SettingsCard v-for="item in items" :key="item.id" v-bind="item" />
</div>
```