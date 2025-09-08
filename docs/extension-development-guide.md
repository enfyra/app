# Extension Development Guide - Enfyra App

The Enfyra App extension system allows you to create custom Vue components that can be uploaded and integrated into the system without rebuilding the entire application. This guide covers everything you need to know to create powerful extensions.

## System Overview

Extensions in Enfyra App are dynamically loaded Vue 3 components that can be:
- **Page Extensions**: Full-page components accessible via routes
- **Widget Extensions**: Reusable components that can be embedded anywhere
- **Component Extensions**: Shareable components for other extensions

Extensions are stored in the database, compiled at runtime, and hot-reloaded for development.

## Extension Types

### 1. Page Extensions
Full-page components that are accessible via specific routes and can register menu items.

### 2. Widget Extensions
Smaller, reusable components that can be embedded anywhere in the application using `<WidgetComponent id="x" />`.

### 3. Component Extensions
Shared components that can be imported and used by other extensions.

## Creating an Extension

### Extension Structure

Extensions consist of two parts:
1. **Metadata**: Stored in the `extension_definition` table
2. **Code**: Vue 3 single-file component code

### Required Fields

```typescript
interface ExtensionDefinition {
  id: number;                    // Auto-generated database ID (used for <Widget :id="x" />)
  extensionId: string;          // Unique identifier string (user-defined)
  name: string;                 // Display name
  description: string;          // Description
  type: 'page' | 'widget' | 'component';
  code: string;                 // Vue SFC code
  compiledCode?: string;        // Compiled version (auto-generated)
  isEnabled: boolean;           // Active status
  isSystem: boolean;            // System extension flag
  menu?: MenuDefinition;        // Menu configuration (for page extensions)
}
```

**Important:** When using `<Widget :id="x" />`, use the numeric ID from the Extensions Manager (the auto-increment `id` field), not the `extensionId` string.

### Menu Configuration (Page Extensions Only)

```typescript
interface MenuDefinition {
  path: string;                 // Route path
  name: string;                 // Route name
  label: string;                // Menu label
  icon: string;                 // Menu icon
  sidebarId: string;           // Parent sidebar ID
  order?: number;              // Menu order
  permission?: PermissionCondition;  // Access permissions
}
```

## Extension Code Structure

### Basic Extension Template

```vue
<template>
  <div class="extension-container p-6">
    <div class="max-w-4xl mx-auto space-y-6">
      <!-- Extension Header -->
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-white mb-2">{{ extensionName }}</h1>
        <p class="text-gray-400">{{ extensionDescription }}</p>
      </div>

      <!-- Extension Content -->
      <div class="grid gap-6">
        <!-- Settings Cards Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <SettingsCard
            title="Extension Status"
            description="Current extension configuration"
            icon="lucide:settings"
            icon-color="primary"
            :stats="[
              { label: 'Status', value: 'Active' },
              { label: 'Version', value: '1.0.0' }
            ]"
            :actions="[
              { label: 'Configure', props: { size: 'sm', variant: 'outline' }, onClick: handleAction }
            ]"
          />
        </div>

        <!-- UI Components -->
        <UCard>
          <template #header>
            <h3 class="text-xl font-semibold">Extension Features</h3>
          </template>
          
          <div class="space-y-4">
            <UButton @click="handleAction" color="primary" block>
              Execute Action
            </UButton>
            
            <UInput 
              v-model="inputValue" 
              placeholder="Enter some text..." 
              class="w-full"
            />
          </div>
        </UCard>

        <!-- Permission-Protected Content -->
        <PermissionGate :condition="{ or: [{ route: '/user_definition', actions: ['read'] }] }">
          <UAlert 
            color="success"
            title="Protected Content"
            description="This content is only visible to users with user read permissions."
          />
        </PermissionGate>

        <!-- Widget Integration -->
        <UCard v-if="showWidget">
          <template #header>
            <h3 class="text-xl font-semibold">Embedded Widget</h3>
          </template>
          
          <!-- Widget with database record ID 5 -->
          <Widget :id="5" :custom-prop="inputValue" />
        </UCard>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Extension metadata
const extensionName = "My Extension";
const extensionDescription = "A powerful extension demonstrating Enfyra App capabilities";

// Props from the extension system
const props = defineProps({
  components: {
    type: Object,
    default: () => ({}),
  },
});

// Extract components - these are injected by the system
const { 
  UButton, 
  UCard, 
  UInput, 
  UAlert,
  UBadge,
  UIcon,
  PermissionGate,
  SettingsCard,
  Widget 
} = props.components;

// Reactive state
const inputValue = ref('');
const showWidget = ref(true);

// Composables (automatically available)
const toast = useToast();
const { me } = useEnfyraAuth();  // From @enfyra/sdk-nuxt
const router = useRouter();
const route = useRoute();

// Extension logic
const handleAction = () => {
  toast.add({
    title: 'Success',
    description: `Action executed with input: "${inputValue.value}"`,
    color: 'success',
  });
};

// Register header actions
useHeaderActionRegistry([
  {
    id: 'my-extension-save',
    label: 'Save',
    icon: 'lucide:save',
    variant: 'solid',
    color: 'primary',
    onClick: handleAction,
  },
  {
    id: 'my-extension-settings',
    label: 'Settings',
    icon: 'lucide:settings',
    variant: 'outline',
    onClick: () => {
      // Navigate to settings or open modal
      toast.add({
        title: 'Info',
        description: 'Settings clicked',
        color: 'info',
      });
    },
  },
]);

// Lifecycle hooks
onMounted(() => {
  console.log('Extension mounted');
  console.log('Current user:', me.value);
  console.log('Current route:', route.path);
});

onUnmounted(() => {
  console.log('Extension unmounted');
});
</script>
```

## Available Components

### Nuxt UI Components

All Nuxt UI components are available via `props.components`:

```typescript
// Buttons & Actions
UButton, UBadge, UIcon

// Form Elements  
UInput, UTextarea, USelect, UCheckbox, URadio, UToggle, URange

// Layout & Navigation
UCard, UModal, UPopover, UTooltip, UDropdown, UAccordion, UTabs

// Data Display
UTable, UPagination, UBreadcrumb, UProgress, UMeter, UKbd

// Feedback
UAlert, UNotifications, USkeleton

// Media
UAvatar, UAvatarGroup

// Overlays
USlideOvers, UCommandPalette
```

### Custom Components

```typescript
// Permission System
PermissionGate

// Dynamic Components
Widget               // For embedding other widgets
PageComponent        // For embedding pages
FormEditor          // Dynamic form builder
DataTable           // Advanced data table
SettingsCard   // Standardized settings cards

// Loading States
LoadingState
EmptyState

// Modals
UploadModal
CommonConfirmModal
```

### Usage Examples

```vue
<template>
  <!-- Basic UI Components -->
  <UButton @click="save" color="primary" :loading="saving">
    Save Changes
  </UButton>

  <UInput 
    v-model="searchQuery" 
    placeholder="Search extensions..." 
    icon="i-heroicons-magnifying-glass"
  />

  <USelect 
    v-model="selectedType" 
    :options="typeOptions"
    placeholder="Select type"
  />

  <!-- Advanced Components -->
  <PermissionGate :condition="{ or: [{ route: '/extension_definition', actions: ['create'] }] }">
    <UButton @click="createExtension">Create New Extension</UButton>
  </PermissionGate>

  <Widget :id="widgetId" :data="widgetData" />  <!-- widgetId = database record ID -->

  <!-- Data Display -->
  <DataTable 
    :data="extensions"
    :columns="columns"
    :loading="loading"
    @row-click="selectExtension"
  />
</template>
```

## Available Composables

### Vue 3 Core Composables
All Vue 3 composition API functions are globally available:

```typescript
// Reactivity
ref, reactive, computed, readonly, toRef, toRefs

// Lifecycle  
onMounted, onUnmounted, onBeforeMount, onBeforeUnmount,
onUpdated, onBeforeUpdate, onActivated, onDeactivated

// Watchers
watch, watchEffect, watchPostEffect, watchSyncEffect

// Dependency Injection
provide, inject

// Template Refs
templateRef, unrefElement
```

### Nuxt 3 Composables

```typescript
// Navigation
const router = useRouter();
const route = useRoute();
await navigateTo('/path');
await refresh();

// State Management
const state = useState('key', () => initialValue);
const cookie = useCookie('cookieName');

// API & Data Fetching
const { data, pending, error } = await useFetch('/api/endpoint');
const { data } = await useAsyncData('key', () => $fetch('/api/data'));

// SEO & Meta
useHead({ title: 'Extension Title' });
useSeoMeta({ description: 'Extension description' });

// Runtime Config
const config = useRuntimeConfig();
const appConfig = useAppConfig();
```

### Enfyra App Composables

#### useAuth()
```typescript
const { me, login, logout, isLoggedIn } = useAuth();

// Current user data
console.log(me.value); // User object or null
console.log(isLoggedIn.value); // boolean
```

#### useEnfyraApi() / useEnfyraAuth()

> **📖 See:** [Official SDK Documentation](https://github.com/dothinh115/enfyra-sdk-nuxt) for complete documentation

```typescript
// API requests using @enfyra/sdk-nuxt
const { data, pending, error } = useEnfyraApi('/extension_definition', {
  query: { limit: 10 },
  key: 'extensions-list'
});

// For complete API documentation:
// 👉 https://github.com/dothinh115/enfyra-sdk-nuxt#api-usage

// Authentication - Official SDK
const { me, login, logout, isLoggedIn } = useEnfyraAuth();

// For complete authentication documentation:
// 👉 https://github.com/dothinh115/enfyra-sdk-nuxt#authentication

// Current user data
console.log(me.value); // User object or null
console.log(isLoggedIn.value); // boolean
```

#### usePermissions()

> **📖 See:** [Permission System](./permission-system.md) for complete documentation

```typescript
const { hasPermission, checkPermissionCondition } = usePermissions();

// Check specific permission
const canCreate = hasPermission('/extension_definition', 'POST');

// Check complex condition
const canManage = checkPermissionCondition({
  and: [
    { route: '/extension_definition', actions: ['read', 'update'] },
    { route: '/user_definition', actions: ['read'] }
  ]
});
```

#### useToast()
```typescript
const toast = useToast();

toast.add({
  title: 'Success',
  description: 'Operation completed successfully',
  color: 'success', // success, error, warning, info, primary
  timeout: 5000,
});
```

#### useHeaderActionRegistry()

> **📖 See:** [Header Action Registry](./header-action-registry.md) for complete documentation

```typescript
// Register header actions
useHeaderActionRegistry([
  {
    id: 'extension-action-1',
    label: 'Save',
    icon: 'lucide:save',
    variant: 'solid',
    color: 'primary',
    onClick: () => save(),
    permission: {
      or: [{ route: '/extension_definition', actions: ['update'] }]
    }
  },
  {
    id: 'extension-action-2',
    label: 'Export',
    icon: 'lucide:download',
    variant: 'outline',
    onClick: () => exportData(),
  }
]);
```

#### useSchema()

> **📖 See:** [Form Field System](./form-field.md) for complete documentation

```typescript
const { validate, generateEmptyForm, getIncludeFields } = useSchema('extension_definition');

// Form validation
const { isValid, errors } = validate(formData.value);

// Generate empty form
const emptyForm = generateEmptyForm();
```

#### useConfirm()
```typescript
const { confirm } = useConfirm();

const isConfirmed = await confirm({
  title: 'Delete Extension',
  content: 'Are you sure you want to delete this extension?',
  confirmText: 'Delete',
  cancelText: 'Cancel',
});

if (isConfirmed) {
  // Proceed with deletion
}
```

## Settings Card Component

The `SettingsCard` provides a consistent, tablet-optimized card layout for settings-related content in extensions.

> **📖 See:** [Settings Card Documentation](./settings-card.md) for complete usage guide and examples

### Basic Usage

```vue
<template>
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    <SettingsCard
      title="Extension Config"
      description="Manage extension settings"
      icon="lucide:settings"
      icon-color="primary"
      :stats="[
        { label: 'Status', value: 'Active' },
        { label: 'Version', value: '1.2.0' },
        { 
          label: 'Type',
          component: 'UBadge',
          props: { color: 'success', variant: 'soft' },
          value: 'Page Extension'
        }
      ]"
      :actions="[
        { 
          label: 'Configure', 
          props: { size: 'sm', variant: 'outline' }, 
          onClick: openSettings 
        },
        { 
          label: 'View Details', 
          props: { size: 'sm', variant: 'solid', color: 'primary' }, 
          to: '/extension/details',
          block: true 
        }
      ]"
    />
  </div>
</template>

<script setup lang="ts">
const props = defineProps({
  components: {
    type: Object,
    default: () => ({}),
  },
});

const { SettingsCard } = props.components;

const openSettings = () => {
  // Extension settings logic
  console.log('Opening settings...');
};
</script>
```

### Advanced Settings Card with Header Actions

```vue
<template>
  <SettingsCard
    title="User Management"
    description="Extension user controls"
    icon="lucide:users"
    icon-color="success"
    :stats="[
      { label: 'Total Users', value: userCount },
      { label: 'Active', value: activeUsers }
    ]"
    :header-actions="[
      {
        component: 'USwitch',
        props: { modelValue: extensionEnabled, size: 'md' },
        onUpdate: toggleExtension
      },
      {
        component: 'UButton',
        props: { icon: 'lucide:refresh-cw', variant: 'ghost', size: 'sm' },
        onClick: refreshData
      }
    ]"
  >
    <!-- Custom content inside card -->
    <div class="space-y-3">
      <div class="text-sm text-gray-600">
        Extension-specific content can go here
      </div>
    </div>

    <template #footer>
      <div class="flex justify-between">
        <span class="text-xs text-gray-500">Last updated: {{ lastUpdate }}</span>
        <UButton size="xs" variant="ghost" @click="viewLogs">View Logs</UButton>
      </div>
    </template>
  </SettingsCard>
</template>
```

## Widget Integration

### Using Widgets in Extensions

The `<Widget />` component allows you to embed other widget extensions by their ID. Simply provide the widget ID and the component will automatically load and display it.

**Important:** Use the database record ID (the auto-increment `id` field from Extensions Manager), not the `extensionId` string.

```vue
<template>
  <div class="widget-container">
    <!-- Embed a widget by ID -->
    <Widget :id="5" />
    
    <!-- Pass props to widget -->
    <Widget 
      :id="selectedWidgetId" 
      :user-data="currentUser"
      :config="widgetConfig"
      @widget-event="handleWidgetEvent"
    />
    
    <!-- Multiple widgets in a grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Widget v-for="widgetId in widgetIds" :key="widgetId" :id="widgetId" />
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps({
  components: {
    type: Object,
    default: () => ({}),
  },
});

const { Widget } = props.components;
const { me } = useEnfyraAuth();

// Widget IDs (found in Extensions Manager)
const selectedWidgetId = ref(5);
const widgetIds = ref([3, 7, 12]);

const currentUser = computed(() => me.value);
const widgetConfig = ref({
  theme: 'dark',
  showHeader: true,
});

const handleWidgetEvent = (eventData) => {
  console.log('Widget event received:', eventData);
};
</script>
```

### Creating Widget Extensions

Widget extensions are smaller, reusable components:

```vue
<template>
  <div class="widget-wrapper">
    <UCard>
      <template #header>
        <div class="flex justify-between items-center">
          <h3 class="font-semibold">{{ title }}</h3>
          <UBadge :color="statusColor">{{ status }}</UBadge>
        </div>
      </template>
      
      <div class="space-y-4">
        <div class="text-2xl font-bold">{{ count }}</div>
        <UButton @click="increment" size="sm" block>
          Increment
        </UButton>
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
// Widget props
const props = defineProps({
  title: {
    type: String,
    default: 'Counter Widget'
  },
  initialCount: {
    type: Number,
    default: 0
  },
  components: {
    type: Object,
    default: () => ({})
  }
});

// Emit events to parent
const emit = defineEmits(['count-changed']);

const { UCard, UButton, UBadge } = props.components;

const count = ref(props.initialCount);
const status = computed(() => count.value > 0 ? 'Active' : 'Inactive');
const statusColor = computed(() => count.value > 0 ? 'success' : 'neutral');

const increment = () => {
  count.value++;
  emit('count-changed', count.value);
};

// Widget can also use all composables
const toast = useToast();

watch(count, (newCount) => {
  if (newCount % 5 === 0 && newCount > 0) {
    toast.add({
      title: 'Milestone!',
      description: `Count reached ${newCount}`,
      color: 'success'
    });
  }
});
</script>
```

## Advanced Features

### Building Filter Interfaces

> **📖 Complete Guide:** [Filter System Documentation](./filter-query.md)

Extensions can build powerful filtering interfaces using the integrated filter system:

```vue
<template>
  <div class="extension-with-filters">
    <SettingsCard title="Data Management" description="Manage your data with advanced filtering">
      <!-- Filter Status Display -->
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold">Records</h3>
        <div class="flex gap-2">
          <!-- Filter trigger button -->
          <UButton
            :variant="hasActiveFilters(currentFilter) ? 'solid' : 'outline'"
            :color="hasActiveFilters(currentFilter) ? 'primary' : 'neutral'"
            icon="lucide:filter"
            @click="showFilterDrawer = true"
          >
            {{ hasActiveFilters(currentFilter) ? `Filters (${currentFilter.conditions.length})` : 'Add Filters' }}
          </UButton>
          
          <!-- Clear filters button -->
          <UButton
            v-if="hasActiveFilters(currentFilter)"
            variant="ghost"
            icon="lucide:x"
            @click="clearFilters"
          >
            Clear
          </UButton>
        </div>
      </div>

      <!-- Active filter indicators -->
      <div v-if="hasActiveFilters(currentFilter)" class="mb-4">
        <UBadge color="primary" variant="soft" class="mr-2">
          {{ currentFilter.conditions.length }} active filters
        </UBadge>
        <span class="text-sm text-gray-600">
          {{ getFilterSummary(currentFilter, fieldOptions) }}
        </span>
      </div>

      <!-- Data display with filtering -->
      <div class="space-y-4">
        <div v-if="loading" class="text-center py-8">
          <LoadingState title="Loading data..." />
        </div>
        
        <div v-else-if="filteredData.length === 0" class="text-center py-8">
          <EmptyState
            title="No data found"
            :description="hasActiveFilters(currentFilter) ? 'No records match your filters' : 'No records available'"
            icon="lucide:database"
          />
        </div>
        
        <div v-else class="grid gap-4">
          <UCard v-for="item in filteredData" :key="item.id" class="p-4">
            <h4 class="font-medium">{{ item.name }}</h4>
            <p class="text-sm text-gray-600 mt-1">{{ item.description }}</p>
            <div class="flex gap-2 mt-3">
              <UBadge :color="item.status === 'active' ? 'success' : 'neutral'">
                {{ item.status }}
              </UBadge>
              <span class="text-xs text-gray-500">{{ formatDate(item.createdAt) }}</span>
            </div>
          </UCard>
        </div>
      </div>

      <!-- Pagination -->
      <UPagination
        v-if="totalPages > 1"
        v-model="currentPage"
        :page-count="pageSize"
        :total="totalRecords"
        class="mt-6"
      />
    </SettingsCard>

    <!-- Filter Drawer -->
    <FilterDrawer
      v-model="showFilterDrawer"
      v-model:filter-value="currentFilter"
      :table-name="tableName"
      @apply="applyFilters"
      @clear="clearFilters"
    />
  </div>
</template>

<script setup lang="ts">
const props = defineProps({
  components: {
    type: Object,
    default: () => ({}),
  },
});

// Destructure injected components
const {
  SettingsCard,
  UButton,
  UBadge,
  UCard,
  UPagination,
  LoadingState,
  EmptyState,
  FilterDrawer,
} = props.components;

// Filter composables
const { 
  createEmptyFilter, 
  buildQuery, 
  hasActiveFilters, 
  getFilterSummary 
} = useFilterQuery();

// Extension state
const tableName = 'user_definition'; // Your target table
const showFilterDrawer = ref(false);
const currentFilter = ref(createEmptyFilter());
const currentPage = ref(1);
const pageSize = 10;
const filteredData = ref([]);
const totalRecords = ref(0);
const loading = ref(false);

// Field definitions for filter summary
const fieldOptions = ref([
  { label: 'Name', value: 'name' },
  { label: 'Email', value: 'email' },
  { label: 'Status', value: 'status' },
  { label: 'Created Date', value: 'createdAt' },
]);

// API integration with filters
const { data: apiData, execute: fetchData } = useEnfyraApi(`/${tableName}`, {
  query: computed(() => {
    const baseQuery = {
      limit: pageSize,
      page: currentPage.value,
      fields: '*',
      meta: '*',
    };

    // Add filter to query if active
    if (hasActiveFilters(currentFilter.value)) {
      baseQuery.filter = buildQuery(currentFilter.value);
    }

    return baseQuery;
  }),
  errorContext: 'Extension Data Fetch',
});

// Computed properties
const totalPages = computed(() => Math.ceil(totalRecords.value / pageSize));

// Watch for API data changes
watch(apiData, (newData) => {
  if (newData?.data) {
    filteredData.value = newData.data;
    totalRecords.value = newData.meta?.totalCount || 0;
  }
}, { immediate: true });

// Filter handlers
async function applyFilters() {
  currentPage.value = 1; // Reset to first page
  loading.value = true;
  await fetchData();
  loading.value = false;
}

function clearFilters() {
  currentFilter.value = createEmptyFilter();
  applyFilters();
}

// Utility functions
function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString();
}

// Initial data load
onMounted(() => {
  fetchData();
});
</script>
```

### Advanced Filter Features

#### Custom Filter Presets
```typescript
// Extension with predefined filters
const filterPresets = {
  active: {
    id: 'preset-active',
    operator: 'and',
    conditions: [
      { id: '1', field: 'status', operator: '_eq', value: 'active' }
    ]
  },
  recent: {
    id: 'preset-recent',
    operator: 'and', 
    conditions: [
      { 
        id: '2', 
        field: 'createdAt', 
        operator: '_gte', 
        value: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() 
      }
    ]
  }
};

// Apply preset
function applyPreset(presetKey: string) {
  currentFilter.value = { ...filterPresets[presetKey] };
  applyFilters();
}
```

#### URL Filter Persistence
```typescript
// Save filter state to URL for bookmarking
const { encodeFilterToUrl, parseFilterFromUrl } = useFilterQuery();
const router = useRouter();
const route = useRoute();

function saveFiltersToUrl() {
  if (hasActiveFilters(currentFilter.value)) {
    const encoded = encodeFilterToUrl(currentFilter.value);
    router.push({ query: { ...route.query, filter: encoded } });
  }
}

// Restore from URL on mount
onMounted(() => {
  const urlFilter = parseFilterFromUrl(route.query);
  if (urlFilter) {
    currentFilter.value = urlFilter;
  }
  fetchData();
});
```

#### Context-Aware Filtering
```typescript
// Different filters based on user permissions
const { user } = useAuth();
const { hasPermission } = usePermissions();

const contextualFilter = computed(() => {
  const filter = createEmptyFilter();
  
  // Regular users only see their own records
  if (!hasPermission('/admin', 'read')) {
    filter.conditions.push({
      id: 'user-context',
      field: 'userId',
      operator: '_eq',
      value: user.value.id
    });
  }
  
  return filter;
});

// Initialize with contextual filter
onMounted(() => {
  currentFilter.value = contextualFilter.value;
  fetchData();
});
```

### API Integration

```vue
<script setup lang="ts">
// Fetching data
const { data: extensions, pending: loading, execute: refetch } = useEnfyraApi(
  () => '/extension_definition',
  {
    query: {
      fields: '*,menu.*',
      filter: { isEnabled: { _eq: true } }
    },
    errorContext: 'Fetch Extensions'
  }
);

// Creating data
const { execute: createExtension, error: createError } = useEnfyraApi(
  () => '/extension_definition',
  {
    method: 'post',
    errorContext: 'Create Extension'
  }
);

const handleCreate = async (formData) => {
  await createExtension({ body: formData });
  
  if (!createError.value) {
    toast.add({
      title: 'Success',
      description: 'Extension created successfully',
      color: 'success'
    });
    await refetch();
  }
};
</script>
```

### Form Handling

```vue
<template>
  <UForm :state="form" @submit="handleSubmit" class="space-y-4">
    <FormEditor
      v-model="form"
      v-model:errors="errors"
      :table-name="tableName"
      :excluded="['id', 'createdAt', 'updatedAt']"
      :type-map="{
        code: { type: 'code', language: 'vue', height: '400px' },
        description: { type: 'textarea', rows: 3 }
      }"
    />
  </UForm>
</template>

<script setup lang="ts">
const form = ref({});
const errors = ref({});
const tableName = 'extension_definition';

const { validate, generateEmptyForm } = useSchema(tableName);

const handleSubmit = () => {
  const { isValid, errors: validationErrors } = validate(form.value);
  
  if (!isValid) {
    errors.value = validationErrors;
    return;
  }
  
  // Process form
  createExtension(form.value);
};

onMounted(() => {
  form.value = generateEmptyForm();
});
</script>
```

### Permission Handling

```vue
<template>
  <div class="extension-layout">
    <!-- Admin-only content -->
    <PermissionGate :condition="{ or: [{ route: '/extension_definition', actions: ['create'] }] }">
      <UAlert 
        color="info"
        title="Admin Panel"
        description="You have administrator privileges."
      />
    </PermissionGate>

    <!-- Content for specific permissions -->
    <PermissionGate :condition="{
      and: [
        { route: '/extension_definition', actions: ['read'] },
        { route: '/user_definition', actions: ['read'] }
      ]
    }">
      <div class="admin-dashboard">
        <!-- Advanced features -->
      </div>
    </PermissionGate>

    <!-- Fallback for no permissions -->
    <div v-if="!hasAnyAccess" class="text-center py-8">
      <UAlert color="warning" title="Access Restricted" />
    </div>
  </div>
</template>

<script setup lang="ts">
const { checkPermissionCondition } = usePermissions();

const hasAnyAccess = computed(() => {
  return checkPermissionCondition({
    or: [
      { route: '/extension_definition', actions: ['read'] },
      { route: '/user_definition', actions: ['read'] }
    ]
  });
});
</script>
```

## Extension Management

### Creating Extensions via UI

1. Navigate to **Settings > Extensions**
2. Click **Create Extension** button
3. Fill in the extension details:
   - **Extension ID**: Unique identifier
   - **Name**: Display name
   - **Description**: Extension description
   - **Type**: page, widget, or component
   - **Code**: Vue SFC code
4. Configure menu settings (for page extensions)
5. Click **Save**

### Uploading Extensions

1. Create a `.vue` file with your extension code
2. Navigate to **Settings > Extensions > Create**
3. Click **Upload** button
4. Select your `.vue` file
5. The system will automatically populate the code field
6. Configure other settings and save

### Extension Hot Reloading

Extensions support hot reloading during development:

1. Make changes to your extension code
2. Save the extension
3. The extension will automatically reload without page refresh
4. Check browser console for any compilation errors

## Best Practices

### 1. Code Organization

```vue
<template>
  <!-- Keep template clean and organized -->
  <div class="extension-root">
    <ExtensionHeader :title="title" :description="description" />
    <ExtensionContent>
      <ExtensionSection v-for="section in sections" :key="section.id">
        <!-- Section content -->
      </ExtensionSection>
    </ExtensionContent>
  </div>
</template>

<script setup lang="ts">
// Group related functionality
import { useExtensionLogic } from './composables/useExtensionLogic';
import { useExtensionData } from './composables/useExtensionData';

// Clear prop definitions
const props = defineProps({
  components: {
    type: Object,
    default: () => ({})
  },
  // Extension-specific props
  config: {
    type: Object,
    default: () => ({})
  }
});

// Organized composable usage
const { title, description, sections } = useExtensionLogic(props.config);
const { data, loading, error } = useExtensionData();
</script>
```

### 2. Error Handling

```vue
<script setup lang="ts">
const handleAsyncOperation = async () => {
  try {
    const result = await someApiCall();
    
    toast.add({
      title: 'Success',
      description: 'Operation completed successfully',
      color: 'success'
    });
  } catch (error) {
    console.error('Extension error:', error);
    
    toast.add({
      title: 'Error',
      description: error.message || 'An unexpected error occurred',
      color: 'error'
    });
  }
};

// Global error handling
onErrorCaptured((error, instance, errorInfo) => {
  console.error('Extension error captured:', error);
  
  toast.add({
    title: 'Extension Error',
    description: 'The extension encountered an error and has been recovered.',
    color: 'error'
  });
  
  return false; // Prevent error from propagating
});
</script>
```

### 3. Performance Optimization

```vue
<script setup lang="ts">
// Use computed properties for expensive calculations
const processedData = computed(() => {
  if (!rawData.value) return [];
  
  return rawData.value
    .filter(item => item.isActive)
    .sort((a, b) => a.name.localeCompare(b.name));
});

// Lazy load heavy operations
const { data: heavyData, pending: heavyLoading } = useAsyncData(
  'heavy-operation',
  () => performHeavyOperation(),
  {
    lazy: true // Only load when needed
  }
);

// Debounce user input
const debouncedSearch = useDebounceFn((query) => {
  performSearch(query);
}, 300);
</script>
```

### 4. Responsive Design

```vue
<template>
  <div class="extension-responsive">
    <!-- Mobile-first grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <ExtensionCard v-for="item in items" :key="item.id" />
    </div>
    
    <!-- Responsive navigation -->
    <div class="flex flex-col sm:flex-row gap-4 mt-6">
      <UButton class="w-full sm:w-auto">Action 1</UButton>
      <UButton class="w-full sm:w-auto">Action 2</UButton>
    </div>
  </div>
</template>
```

### 5. Accessibility

```vue
<template>
  <div class="accessible-extension">
    <!-- Proper heading hierarchy -->
    <h1 class="text-2xl font-bold">Extension Title</h1>
    <h2 class="text-xl font-semibold">Section Title</h2>
    
    <!-- Accessible form elements -->
    <UInput
      v-model="searchQuery"
      :aria-label="'Search extensions'"
      placeholder="Search..."
    />
    
    <!-- Proper button labeling -->
    <UButton
      :aria-label="'Delete extension ' + extension.name"
      @click="deleteExtension(extension)"
    >
      <UIcon name="i-heroicons-trash" />
    </UButton>
  </div>
</template>
```

## Troubleshooting

### Common Issues

#### 1. Extension Not Loading
```typescript
// Check console for errors
console.log('Extension mounted');

// Verify component extraction
const { UButton } = props.components;
if (!UButton) {
  console.error('UButton component not available');
}

// Check API connectivity
const { data, error } = useEnfyraApi('/extension_definition');
watch(error, (err) => {
  if (err) {
    console.error('API Error:', err);
  }
});
```

#### 2. Components Not Rendering
```vue
<script setup lang="ts">
// Debug component availability
const props = defineProps({
  components: {
    type: Object,
    default: () => ({})
  }
});

console.log('Available components:', Object.keys(props.components));

// Verify component usage
const { UButton, UCard } = props.components;

if (!UButton) {
  console.warn('UButton not available, check component injection');
}
</script>
```

#### 3. Permission Issues
```vue
<script setup lang="ts">
const { me } = useEnfyraAuth();
const { hasPermission, checkPermissionCondition } = usePermissions();

// Debug permissions
console.log('Current user:', me.value);
console.log('User permissions:', me.value?.role?.routePermissions);

// Test specific permission
const canRead = hasPermission('/extension_definition', 'GET');
console.log('Can read extensions:', canRead);

// Test permission condition
const condition = { or: [{ route: '/extension_definition', actions: ['read'] }] };
const hasAccess = checkPermissionCondition(condition);
console.log('Has access via condition:', hasAccess);
</script>
```

#### 4. API Errors
```vue
<script setup lang="ts">
// Monitor API calls
const { data, error, pending, execute } = useEnfyraApi(
  () => '/extension_definition',
  {
    errorContext: 'Extension API',
    onError: (error) => {
      console.error('API Error Details:', error);
    }
  }
);

// Check API response
watch(data, (newData) => {
  console.log('API Response:', newData);
});

watch(error, (newError) => {
  if (newError) {
    console.error('API Error:', newError);
    
    // Show user-friendly error
    toast.add({
      title: 'API Error',
      description: 'Failed to load data. Please try again.',
      color: 'error'
    });
  }
});
</script>
```

### Debugging Tools

```vue
<script setup lang="ts">
// Development-only debugging
if (process.dev) {
  // Extension state debugging
  const debugState = computed(() => ({
    user: me.value,
    route: route.path,
    permissions: me.value?.role?.routePermissions,
    extensionProps: props
  }));
  
  // Log state changes
  watch(debugState, (state) => {
    console.log('Extension Debug State:', state);
  }, { deep: true });
}

// Performance monitoring
const startTime = Date.now();

onMounted(() => {
  const loadTime = Date.now() - startTime;
  console.log(`Extension loaded in ${loadTime}ms`);
});
</script>
```

## Summary

The Enfyra App extension system provides:

1. **Three Extension Types**: Page, Widget, and Component extensions
2. **Full Vue 3 Support**: Complete access to Composition API and lifecycle hooks
3. **Rich Component Library**: All Nuxt UI components plus custom CMS components
4. **Powerful Composables**: Authentication, API, permissions, and utility functions
5. **Permission Integration**: Fine-grained access control
6. **Hot Reloading**: Development-friendly with instant updates
7. **Widget System**: Reusable components with `<Widget />`

Extensions can be as simple as a basic component or as complex as a full application with API integration, permission handling, and advanced UI features. The system provides all the tools needed to create powerful, maintainable extensions that integrate seamlessly with the CMS.

**Key Points:**
- Use `<Widget :id="x" />` to embed other widgets - just provide the ID and it works automatically
- The `id` is the numeric ID from Extensions Manager, not the `extensionId` string
- All components are available via `props.components` destructuring
- Extensions support hot reloading and dynamic compilation
- Full access to Vue 3 Composition API and Nuxt 3 composables