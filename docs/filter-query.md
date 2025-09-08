# Filter System - Usage Guide

The Enfyra App Filter System provides a comprehensive solution for building complex data queries with an intuitive UI. The system includes composables, components, and utilities for creating flexible filter conditions.

## System Components

### useFilterQuery Composable

> **📖 See also:** [API Guide](./api-composables.md) for @enfyra/sdk-nuxt integration

The main composable for handling filter operations:

```typescript
const { 
  buildQuery, 
  createEmptyFilter, 
  hasActiveFilters, 
  getFilterSummary,
  parseFilterFromUrl,
  encodeFilterToUrl 
} = useFilterQuery();
```

### FilterDrawer Component

A slide-out drawer for building complex filters:

```vue
<FilterDrawer
  v-model="showFilterDrawer"
  v-model:filter-value="currentFilter"
  :table-name="tableName"
  @apply="applyFilters"
  @clear="clearFilters"
/>
```

### FilterBuilder Component

The core filter building interface (used inside FilterDrawer):

```vue
<FilterBuilder
  v-model="filterGroup"
  :schemas="schemas"
  :table-name="tableName"
/>
```

## Complete Interfaces

### FilterCondition Interface
```typescript
interface FilterCondition {
  id: string;           // Unique identifier
  field: string;        // Field name to filter on
  operator: string;     // Comparison operator
  value: any;           // Value to compare against
  type?: string;        // Field data type hint
}
```

### FilterGroup Interface
```typescript
interface FilterGroup {
  id: string;                                    // Unique identifier
  operator: "and" | "or";                        // Logic operator
  conditions: (FilterCondition | FilterGroup)[]; // Nested conditions/groups
  relationContext?: string;                      // Context for relation filtering
}
```

### useFilterQuery Return Type
```typescript
interface UseFilterQueryReturn {
  buildQuery: (filter: FilterGroup) => Record<string, any>;
  createEmptyFilter: () => FilterGroup;
  hasActiveFilters: (filter: FilterGroup) => boolean;
  getFilterSummary: (filter: FilterGroup, fields: FieldOption[]) => string;
  parseFilterFromUrl: (searchParams: URLSearchParams) => FilterGroup | null;
  encodeFilterToUrl: (filter: FilterGroup) => string;
}
```

## Basic Usage Patterns

### 1. Data Listing with Filters

Complete example from a data listing page:

```vue
<template>
  <div class="space-y-4">
    <!-- Header with Filter Status -->
    <div class="flex items-center justify-between">
      <h1>{{ tableName }} Records</h1>
      
      <!-- Active filter indicator -->
      <div v-if="hasActiveFilters(currentFilter)" class="flex items-center gap-2">
        <UBadge color="primary" variant="soft">
          {{ currentFilter.conditions.length }} active filters
        </UBadge>
        <UButton
          icon="i-lucide-x"
          size="xs"
          variant="ghost" 
          @click="clearFilters"
        >
          Clear
        </UButton>
      </div>
    </div>

    <!-- Data Table -->
    <DataTable
      :data="data"
      :columns="columns"
      :loading="loading"
      @row-click="(row) => navigateTo(`/data/${tableName}/${row.id}`)"
    />

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
const route = useRoute();
const tableName = route.params.table as string;
const { schemas } = useGlobalState();

// Filter composable
const { createEmptyFilter, buildQuery, hasActiveFilters } = useFilterQuery();

// Filter state
const showFilterDrawer = ref(false);
const currentFilter = ref(createEmptyFilter());

// Pagination state
const page = ref(1);
const pageLimit = 10;
const data = ref([]);
const total = ref(0);

// Reactive query with filter integration
const { 
  data: apiData, 
  pending: loading, 
  execute: fetchData 
} = useApiLazy(() => `/${tableName}`, {
  query: computed(() => {
    // Build filter query object
    const filterQuery = hasActiveFilters(currentFilter.value)
      ? buildQuery(currentFilter.value)
      : {};

    return {
      limit: pageLimit,
      page: page.value,
      fields: "*",
      meta: "*",
      // Add filter to query if there are active filters
      ...(Object.keys(filterQuery).length > 0 && { filter: filterQuery }),
    };
  }),
  errorContext: "Fetch Data",
});

// Header actions for filter
useHeaderActionRegistry([
  {
    id: "filter-data-entries",
    get label() {
      const activeCount = currentFilter.value.conditions.length;
      return activeCount > 0 ? `Filters (${activeCount})` : "Filter";
    },
    icon: "lucide:filter",
    get variant() {
      return hasActiveFilters(currentFilter.value) ? "solid" : "outline";
    },
    get color() {
      return hasActiveFilters(currentFilter.value) ? "secondary" : "neutral";
    },
    onClick: () => {
      showFilterDrawer.value = true;
    },
  },
]);

// Watch for API data changes
watch(apiData, (newData) => {
  if (newData?.data) {
    data.value = newData.data;
    // Use filtered count when filters are active
    const hasFilters = hasActiveFilters(currentFilter.value);
    total.value = hasFilters
      ? newData.meta?.filterCount || newData.meta?.totalCount || 0
      : newData.meta?.totalCount || 0;
  }
}, { immediate: true });

// Filter handlers
async function applyFilters() {
  page.value = 1; // Reset to first page when filtering
  await fetchData();
}

function clearFilters() {
  currentFilter.value = createEmptyFilter();
  applyFilters();
}

// Load initial data
onMounted(() => {
  fetchData();
});
</script>
```

### 2. Advanced Filter Building

Create complex filters programmatically:

```typescript
// Create empty filter
const filter = createEmptyFilter();

// Add basic condition
filter.conditions.push({
  id: 'condition-1',
  field: 'status',
  operator: '_eq',
  value: 'active'
});

// Add nested group with OR logic
const nestedGroup: FilterGroup = {
  id: 'group-1',
  operator: 'or',
  conditions: [
    {
      id: 'condition-2', 
      field: 'priority',
      operator: '_eq',
      value: 'high'
    },
    {
      id: 'condition-3',
      field: 'urgent',
      operator: '_eq', 
      value: true
    }
  ]
};

filter.conditions.push(nestedGroup);

// Build final query
const queryObject = buildQuery(filter);
// Result: {
//   _and: [
//     { status: { _eq: 'active' } },
//     { _or: [
//       { priority: { _eq: 'high' } },
//       { urgent: { _eq: true } }
//     ]}
//   ]
// }
```

### 3. URL Integration

Persist filter state in URL for bookmarking and sharing:

```typescript
const router = useRouter();
const route = useRoute();

// Save filter to URL
function saveFilterToUrl() {
  if (hasActiveFilters(currentFilter.value)) {
    const encodedFilter = encodeFilterToUrl(currentFilter.value);
    router.push({ 
      query: { 
        ...route.query, 
        filter: encodedFilter 
      } 
    });
  } else {
    // Remove filter from URL if no active filters
    const { filter, ...otherQuery } = route.query;
    router.push({ query: otherQuery });
  }
}

// Restore filter from URL on page load
onMounted(() => {
  const urlFilter = parseFilterFromUrl(route.query);
  if (urlFilter) {
    currentFilter.value = urlFilter;
  }
  fetchData();
});
```

## Supported Operators

### Basic Comparison
- `_eq` - Equals
- `_neq` - Not equals  
- `_gt` - Greater than
- `_gte` - Greater than or equal
- `_lt` - Less than
- `_lte` - Less than or equal

### Text Operations
- `_contains` - Contains substring
- `_starts_with` - Starts with string
- `_ends_with` - Ends with string

### Array Operations
- `_in` - Value in array
- `_not_in` - Value not in array

### Special Operations  
- `_is_null` - Field is null
- `_between` - Between two values (requires array of 2 elements)

## Advanced Features

### 1. Nested Field Filtering

Filter on related table fields using dot notation:

```typescript
const filter = {
  operator: "and",
  conditions: [
    {
      id: "nested-1",
      field: "user.profile.name", // Dot notation for nested relations
      operator: "_contains",
      value: "John"
    },
    {
      id: "nested-2", 
      field: "user.role.name",
      operator: "_eq",
      value: "admin"
    }
  ]
};

const query = buildQuery(filter);
// Result: {
//   _and: [
//     { user: { profile: { name: { _contains: "John" } } } },
//     { user: { role: { name: { _eq: "admin" } } } }
//   ]
// }
```

### 2. Filter Summary Display

Generate human-readable filter descriptions:

```typescript
const fieldOptions = [
  { label: "Full Name", value: "name" },
  { label: "Email Address", value: "email" }, 
  { label: "Account Status", value: "status" }
];

const summary = getFilterSummary(currentFilter.value, fieldOptions);
// Example output: "Full Name contains 'John' AND Account Status = 'active'"

// Display in UI
const filterDescription = computed(() => {
  return hasActiveFilters(currentFilter.value) 
    ? getFilterSummary(currentFilter.value, fieldOptions)
    : "No filters applied";
});
```

### 3. Conditional Filter Loading

Load different filter presets based on user context:

```typescript
// Admin sees all records, users see only their own
const defaultFilter = computed(() => {
  const { user } = useAuth();
  
  if (user.value?.role === 'admin') {
    return createEmptyFilter(); // No restrictions
  }
  
  // Regular users only see their own records
  const userFilter = createEmptyFilter();
  userFilter.conditions.push({
    id: 'user-restriction',
    field: 'userId',
    operator: '_eq', 
    value: user.value.id
  });
  
  return userFilter;
});

// Initialize with default filter
onMounted(() => {
  currentFilter.value = defaultFilter.value;
  fetchData();
});
```

## FilterDrawer Component Usage

### Props Interface
```typescript
interface FilterDrawerProps {
  modelValue: boolean;          // Drawer visibility
  filterValue: FilterGroup;     // Current filter state
  tableName: string;           // Table to filter on
}

interface FilterDrawerEmits {
  'update:modelValue': [value: boolean];
  'update:filterValue': [value: FilterGroup]; 
  'apply': [];                 // When user applies filters
  'clear': [];                 // When user clears all filters
}
```

### Complete Implementation

```vue
<template>
  <!-- Trigger button -->
  <UButton
    :variant="hasActiveFilters(currentFilter) ? 'solid' : 'outline'"
    :color="hasActiveFilters(currentFilter) ? 'primary' : 'neutral'"
    icon="lucide:filter"
    @click="showFilterDrawer = true"
  >
    {{ hasActiveFilters(currentFilter) ? 'Filters Active' : 'Add Filters' }}
  </UButton>

  <!-- Filter Drawer -->
  <FilterDrawer
    v-model="showFilterDrawer"
    v-model:filter-value="currentFilter"
    :table-name="tableName"
    @apply="handleApplyFilters"
    @clear="handleClearFilters"
  />
</template>

<script setup lang="ts">
const { createEmptyFilter, hasActiveFilters, buildQuery } = useFilterQuery();

const showFilterDrawer = ref(false);
const currentFilter = ref(createEmptyFilter());
const tableName = "user_definition";

// Handle filter events
function handleApplyFilters() {
  // FilterDrawer automatically closes and updates currentFilter
  // Refresh data with new filters
  refreshData();
}

function handleClearFilters() {
  // FilterDrawer automatically resets filter to empty
  refreshData();
}

async function refreshData() {
  // Your data fetching logic here
  const filterQuery = hasActiveFilters(currentFilter.value)
    ? buildQuery(currentFilter.value)
    : {};
    
  await fetchData({ filter: filterQuery });
}
</script>
```

## Best Practices

### Performance Optimization

1. **Debounce Filter Changes**: Avoid excessive API calls during filter building
```typescript
// Debounce filter application
const debouncedApplyFilters = useDebounceFn(applyFilters, 300);
```

2. **Check for Active Filters**: Only add filter to query when necessary
```typescript
const query = computed(() => {
  const baseQuery = { limit: 10, page: 1 };
  
  // Only add filter if there are active conditions
  if (hasActiveFilters(currentFilter.value)) {
    baseQuery.filter = buildQuery(currentFilter.value);
  }
  
  return baseQuery;
});
```

3. **Use Computed Properties**: Make filter states reactive
```typescript
const filterButtonLabel = computed(() => {
  const count = currentFilter.value.conditions.length;
  return count > 0 ? `Filters (${count})` : 'Add Filter';
});
```

### User Experience

1. **Visual Filter State**: Show active filter indicators
```vue
<template>
  <div class="filter-status">
    <UBadge 
      v-if="hasActiveFilters(currentFilter)"
      color="primary" 
      variant="soft"
    >
      {{ currentFilter.conditions.length }} active
    </UBadge>
  </div>
</template>
```

2. **Clear Filter Option**: Always provide easy filter reset
```vue
<UButton 
  v-if="hasActiveFilters(currentFilter)"
  icon="lucide:x"
  variant="ghost"
  @click="clearFilters"
>
  Clear Filters
</UButton>
```

3. **Filter Summary**: Show readable filter description
```vue
<div class="filter-summary text-sm text-gray-600">
  {{ getFilterSummary(currentFilter, fieldOptions) }}
</div>
```

### Error Handling

```typescript
// Validate filter before applying
function validateFilter(filter: FilterGroup): boolean {
  return filter.conditions.every(condition => {
    if ('field' in condition) {
      return condition.field && condition.operator;
    } else {
      return validateFilter(condition); // Recursive for nested groups
    }
  });
}

async function applyFilters() {
  if (!validateFilter(currentFilter.value)) {
    toast.add({
      title: 'Invalid Filter',
      description: 'Please complete all filter conditions',
      color: 'error'
    });
    return;
  }
  
  try {
    await fetchData();
  } catch (error) {
    toast.add({
      title: 'Filter Error', 
      description: 'Unable to apply filters. Please try again.',
      color: 'error'
    });
  }
}
```

## Integration Examples

### With Data Tables

```vue
<!-- Complete data table with integrated filtering -->
<template>
  <div>
    <DataTable
      :data="filteredData" 
      :columns="columns"
      :loading="loading"
    >
      <template #header-actions>
        <div class="flex gap-2">
          <UButton
            :variant="hasActiveFilters(currentFilter) ? 'solid' : 'outline'"
            @click="showFilterDrawer = true"
            icon="lucide:filter"
          >
            Filter
          </UButton>
          
          <UButton
            v-if="hasActiveFilters(currentFilter)"
            variant="ghost"
            @click="clearFilters"
            icon="lucide:x"
          >
            Clear
          </UButton>
        </div>
      </template>
    </DataTable>
    
    <FilterDrawer
      v-model="showFilterDrawer"
      v-model:filter-value="currentFilter" 
      :table-name="tableName"
      @apply="applyFilters"
      @clear="clearFilters"
    />
  </div>
</template>
```

### With Header Actions

```typescript
// Register dynamic header actions that respond to filter state
useHeaderActionRegistry([
  {
    id: 'filter-toggle',
    get label() {
      return hasActiveFilters(currentFilter.value) 
        ? `Filters (${currentFilter.value.conditions.length})`
        : 'Filter';
    },
    icon: 'lucide:filter',
    get variant() {
      return hasActiveFilters(currentFilter.value) ? 'solid' : 'outline';
    },
    onClick: () => {
      showFilterDrawer.value = true;
    }
  },
  {
    id: 'clear-filters',
    label: 'Clear',
    icon: 'lucide:x',
    variant: 'ghost',
    get disabled() {
      return !hasActiveFilters(currentFilter.value);
    },
    onClick: clearFilters
  }
]);
```

This filter system provides a complete solution for building sophisticated data filtering interfaces in Enfyra App with excellent user experience and developer productivity.