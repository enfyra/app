# Form Field System - Usage Guide

The Enfyra App Form Field System provides dynamic form generation, validation, and rendering based on database schema definitions. This system automatically creates forms with proper field types, validation rules, and error handling.

## Core Components & Composables

### useSchema(tableName)

> **📖 See also:** [API Guide](./api-composables.md) for @enfyra/sdk-nuxt integration examples

The main composable for schema-based form operations:

```typescript
const { generateEmptyForm, validate, getIncludeFields } = useSchema(tableName);
```

### FormEditor Component

The main form rendering component that creates dynamic forms based on schema:

```vue
<FormEditor
  v-model="form"
  v-model:errors="errors"
  :table-name="tableName"
  :excluded="['id', 'createdAt', 'updatedAt']"
  :type-map="customTypes"
/>
```

## Complete Interfaces

### useSchema Return Type
```typescript
interface UseSchemaReturn {
  generateEmptyForm: (options?: { excluded?: string[] }) => Record<string, any>;
  validate: (record: Record<string, any>) => ValidationResult;
  getIncludeFields: () => string;
  definition: ComputedRef<SchemaField[]>;
  editableFields: ComputedRef<SchemaField[]>;
  fieldMap: ComputedRef<Map<string, SchemaField>>;
}

interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

interface SchemaField {
  name: string;
  propertyName?: string;
  type: string;
  fieldType: 'column' | 'relation';
  relationType?: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';
  isNullable: boolean;
  defaultValue?: any;
  options?: any[];
}
```

### FormEditor Props Interface
```typescript
interface FormEditorProps {
  modelValue: Record<string, any>;        // Form data object
  errors?: Record<string, string>;        // Validation errors
  tableName: string;                      // Database table schema name
  excluded?: string[];                    // Fields to hide from form
  includes?: string[];                    // Only show these fields (if provided)
  typeMap?: Record<string, TypeMapConfig>; // Custom field configurations
  readonly?: boolean;                     // Read-only mode
}

interface TypeMapConfig {
  type?: string;                          // Override field type
  disabled?: boolean;                     // Disable field
  placeholder?: string;                   // Input placeholder
  componentProps?: Record<string, any>;   // Props for the input component
  fieldProps?: Record<string, any>;       // Props for the field wrapper
}
```

## Complete Usage Patterns

### 1. Create Form with API Integration

```vue
<template>
  <div class="create-form">
    <UForm :state="createForm" @submit="handleCreate" class="space-y-6">
      <FormEditor
        v-model="createForm"
        v-model:errors="createErrors"
        :table-name="tableName"
        :excluded="['id', 'createdAt', 'updatedAt', 'isSystem']"
        :type-map="{
          description: { type: 'richtext', fieldProps: { class: 'col-span-2' } },
          code: { type: 'code', language: 'vue', height: '400px' }
        }"
      />
    </UForm>
  </div>
</template>

<script setup lang="ts">
// Props and basic setup
const tableName = 'extension_definition';
const createForm = ref<Record<string, any>>({});
const createErrors = ref<Record<string, string>>({});

// Schema composable with validation
const { generateEmptyForm, validate } = useSchema(tableName);

// API composable for creation
const {
  data: createData,
  error: createError,
  execute: executeCreateExtension,
  pending: createLoading,
} = useApiLazy(() => `/${tableName}`, {
  method: 'post',
  errorContext: 'Create Extension',
});

// Toast for user feedback
const toast = useToast();

// Initialize empty form on mount
onMounted(() => {
  createForm.value = generateEmptyForm();
});

// Handle form submission with validation
async function handleCreate() {
  // Client-side schema validation
  const { isValid, errors } = validate(createForm.value);

  if (!isValid) {
    createErrors.value = errors;
    toast.add({
      title: 'Validation Error',
      description: 'Please check the fields with errors.',
      color: 'error',
    });
    return;
  }

  // Clear previous errors
  createErrors.value = {};

  // Execute API call
  await executeCreateExtension({ body: createForm.value });

  // Handle API errors
  if (createError.value) {
    // API validation errors are handled automatically by useApiLazy
    // But you can add custom handling here if needed
    if (createError.value.statusCode === 422) {
      createErrors.value = createError.value.data?.errors || {};
    }
    return;
  }

  // Success handling
  toast.add({
    title: 'Success',
    description: 'Extension created successfully',
    color: 'success',
  });

  // Navigate to detail page
  if (createData.value?.data?.[0]?.id) {
    await navigateTo(`/settings/extensions/${createData.value.data[0].id}`);
  }
}

// Register header action for form submission
useHeaderActionRegistry({
  id: 'save-extension',
  label: 'Save',
  icon: 'lucide:save',
  variant: 'solid',
  color: 'primary',
  submit: handleCreate,
  loading: computed(() => createLoading.value),
  permission: {
    and: [{ route: '/extension_definition', actions: ['create'] }],
  },
});
</script>
```

### 2. Edit Form with Data Loading

```vue
<template>
  <div class="edit-form">
    <UForm :state="editForm" @submit="handleUpdate" class="space-y-6">
      <FormEditor
        v-model="editForm"
        v-model:errors="editErrors"
        :table-name="tableName"
        :excluded="['createdAt', 'updatedAt', 'isSystem']"
        :type-map="{
          code: { type: 'code', language: 'vue', height: '400px' }
        }"
      />
    </UForm>
  </div>
</template>

<script setup lang="ts">
const route = useRoute();
const tableName = 'extension_definition';
const editForm = ref<Record<string, any>>({});
const editErrors = ref<Record<string, string>>({});

// Schema validation
const { validate, getIncludeFields } = useSchema(tableName);

// Load existing data with relations
const {
  data: loadData,
  pending: loadLoading,
  execute: executeLoad,
} = useApiLazy(() => `/${tableName}`, {
  query: computed(() => ({
    fields: getIncludeFields(), // Auto-include all relations
    filter: { id: { _eq: route.params.id } },
    limit: 1,
  })),
  errorContext: 'Load Extension',
});

// Update API
const {
  error: updateError,
  execute: executeUpdate,
  pending: updateLoading,
} = useApiLazy(() => `/${tableName}`, {
  method: 'patch',
  errorContext: 'Update Extension',
});

// Watch for loaded data and populate form
watch(
  loadData,
  (newData) => {
    if (newData?.data?.[0]) {
      // Clone the data to avoid reactivity issues
      editForm.value = { ...newData.data[0] };
    }
  },
  { immediate: true }
);

// Handle form update
async function handleUpdate() {
  const { isValid, errors } = validate(editForm.value);

  if (!isValid) {
    editErrors.value = errors;
    return;
  }

  editErrors.value = {};

  await executeUpdate({
    body: editForm.value,
    id: route.params.id,
  });

  if (updateError.value) {
    if (updateError.value.statusCode === 422) {
      editErrors.value = updateError.value.data?.errors || {};
    }
    return;
  }

  toast.add({
    title: 'Success',
    description: 'Extension updated successfully',
    color: 'success',
  });

  // Reload data to reflect changes
  await executeLoad();
}

// Load data on mount
onMounted(() => {
  executeLoad();
});

// Register header actions
useHeaderActionRegistry([
  {
    id: 'save-extension-changes',
    label: 'Save Changes',
    icon: 'lucide:save',
    variant: 'solid',
    color: 'primary',
    submit: handleUpdate,
    loading: computed(() => updateLoading.value),
  },
  {
    id: 'reload-extension',
    label: 'Reload',
    icon: 'lucide:refresh-cw',
    variant: 'outline',
    onClick: () => executeLoad(),
    loading: computed(() => loadLoading.value),
  },
]);
</script>
```

### 3. Settings Form Pattern

```vue
<template>
  <div class="settings-form">
    <UForm :state="settingsForm" @submit="handleSaveSettings">
      <FormEditor
        v-model="settingsForm"
        v-model:errors="settingsErrors"
        :table-name="tableName"
        :type-map="{
          siteName: { placeholder: 'My Awesome Site' },
          logoUrl: { type: 'image' },
          theme: {
            type: 'select',
            componentProps: {
              options: [
                { label: 'Light', value: 'light' },
                { label: 'Dark', value: 'dark' },
                { label: 'Auto', value: 'auto' }
              ]
            }
          },
          maintenanceMode: { type: 'boolean' },
          customCss: { 
            type: 'code', 
            language: 'css', 
            fieldProps: { class: 'col-span-2' } 
          }
        }"
      />
    </UForm>
  </div>
</template>

<script setup lang="ts">
const tableName = 'setting_definition';
const settingsForm = ref<Record<string, any>>({});
const settingsErrors = ref<Record<string, string>>({});

const { generateEmptyForm, validate } = useSchema(tableName);

// Load existing settings
const {
  data: settingsData,
  pending: loadingSettings,
  execute: loadSettings,
} = useApiLazy(() => `/setting_definition`, {
  query: { fields: '*', limit: 1 },
  errorContext: 'Load Settings',
});

// Save settings API
const {
  error: saveError,
  execute: executeSaveSettings,
  pending: saveLoading,
} = useApiLazy(() => '/setting_definition', {
  method: 'patch',
  errorContext: 'Save Settings',
});

// Watch for settings data
watch(
  settingsData,
  (newData) => {
    const firstRecord = newData?.data?.[0];
    settingsForm.value = firstRecord || generateEmptyForm();
  },
  { immediate: true }
);

async function handleSaveSettings() {
  const { isValid, errors } = validate(settingsForm.value);
  
  if (!isValid) {
    settingsErrors.value = errors;
    return;
  }

  await executeSaveSettings({
    body: settingsForm.value,
    id: settingsForm.value.id,
  });

  if (!saveError.value) {
    toast.add({
      title: 'Settings Saved',
      description: 'Your settings have been updated successfully',
      color: 'success',
    });
  }
}

// Initialize
onMounted(() => {
  loadSettings();
});

// Header action
useHeaderActionRegistry({
  id: 'save-settings',
  label: 'Save Settings',
  icon: 'lucide:save',
  submit: handleSaveSettings,
  loading: computed(() => saveLoading.value),
});
</script>
```

### 4. Advanced Form with Custom Validation

```vue
<script setup lang="ts">
const userForm = ref<Record<string, any>>({});
const userErrors = ref<Record<string, string>>({});

const { validate: schemaValidate } = useSchema('user_definition');

// Custom validation that extends schema validation
function customValidate(data: Record<string, any>) {
  // First run schema validation
  const { isValid, errors } = schemaValidate(data);

  // Add custom business logic validation
  if (data.password && data.password.length < 8) {
    errors.password = 'Password must be at least 8 characters';
  }

  if (data.password !== data.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }

  if (data.email && !data.email.includes('@')) {
    errors.email = 'Please enter a valid email address';
  }

  // Check if user already exists (you might call an API here)
  if (data.username === 'admin') {
    errors.username = 'Username "admin" is reserved';
  }

  const hasErrors = Object.keys(errors).length > 0;
  return { isValid: !hasErrors, errors };
}

async function handleCreateUser() {
  const { isValid, errors } = customValidate(userForm.value);
  
  if (!isValid) {
    userErrors.value = errors;
    toast.add({
      title: 'Validation Failed',
      description: 'Please correct the highlighted errors',
      color: 'error',
    });
    return;
  }

  // Continue with API call...
}
</script>
```

## Field Types & TypeMap Configuration

### Available Field Types

```typescript
// Basic input types
'string' | 'text' | 'email' | 'password' | 'number' | 'boolean' | 'date' | 'datetime'

// Advanced types  
'richtext' | 'code' | 'json' | 'simple-json' | 'select' | 'multiselect' | 'image' | 'file'

// Relation types
'many-to-one' | 'one-to-many' | 'many-to-many' | 'one-to-one'
```

### Complete TypeMap Examples

```typescript
const advancedTypeMap = {
  // Simple type override
  description: 'richtext',
  
  // Advanced field configuration
  status: {
    type: 'select',
    disabled: false,
    placeholder: 'Choose status...',
    componentProps: {
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Inactive', value: 'inactive' },
        { label: 'Pending', value: 'pending' }
      ],
      clearable: true
    },
    fieldProps: {
      class: 'col-span-1', // Grid column span
      label: 'Custom Label'
    }
  },

  // Code editor
  sourceCode: {
    type: 'code',
    language: 'javascript', // or 'vue', 'css', 'html', etc.
    height: '300px',
    fieldProps: { class: 'col-span-2' } // Full width
  },

  // Rich text editor
  content: {
    type: 'richtext',
    componentProps: {
      toolbar: 'undo redo | bold italic | alignleft aligncenter alignright',
      height: 400
    },
    fieldProps: { class: 'col-span-2' }
  },

  // Multi-select with custom options
  tags: {
    type: 'multiselect',
    componentProps: {
      options: [
        { label: 'Important', value: 'important' },
        { label: 'Urgent', value: 'urgent' },
        { label: 'Low Priority', value: 'low' }
      ],
      searchable: true,
      createOption: true // Allow creating new options
    }
  },

  // Image upload
  avatar: {
    type: 'image',
    componentProps: {
      accept: 'image/*',
      maxSize: 2 * 1024 * 1024, // 2MB
      preview: true
    }
  },

  // Boolean with custom labels
  isActive: {
    type: 'boolean',
    componentProps: {
      onLabel: 'Enabled',
      offLabel: 'Disabled'
    }
  },

  // Number with constraints
  priority: {
    type: 'number',
    componentProps: {
      min: 1,
      max: 10,
      step: 1
    },
    placeholder: 'Enter priority (1-10)'
  },

  // Relation field customization
  category: {
    // For many-to-one relations
    componentProps: {
      displayField: 'name', // Field to show in dropdown
      valueField: 'id',     // Field to use as value
      searchable: true,
      clearable: true
    }
  }
};
```

## Error Handling Patterns

### 1. Validation Error Display

```vue
<template>
  <div class="form-errors" v-if="hasErrors">
    <UAlert
      color="error"
      variant="soft"
      title="Please correct the following errors:"
      :description="errorSummary"
    />
  </div>
</template>

<script setup lang="ts">
const formErrors = ref<Record<string, string>>({});

const hasErrors = computed(() => Object.keys(formErrors.value).length > 0);

const errorSummary = computed(() => {
  const errors = Object.values(formErrors.value);
  return errors.length > 3 
    ? `${errors.slice(0, 3).join(', ')}, and ${errors.length - 3} more errors.`
    : errors.join(', ');
});

// Clear specific field error when user starts typing
function clearFieldError(fieldName: string) {
  const newErrors = { ...formErrors.value };
  delete newErrors[fieldName];
  formErrors.value = newErrors;
}

// Watch form changes to clear errors
watch(form, (newForm, oldForm) => {
  Object.keys(newForm).forEach(key => {
    if (newForm[key] !== oldForm?.[key] && formErrors.value[key]) {
      clearFieldError(key);
    }
  });
}, { deep: true });
</script>
```

### 2. API Error Integration

```typescript
// Handle different types of API errors
async function handleFormSubmit() {
  try {
    await executeApiCall({ body: form.value });
  } catch (error: any) {
    if (error.statusCode === 422) {
      // Validation errors from server
      formErrors.value = error.data?.errors || {};
    } else if (error.statusCode === 409) {
      // Conflict errors (duplicate records, etc.)
      toast.add({
        title: 'Conflict Error',
        description: error.message || 'A record with this data already exists',
        color: 'error',
      });
    } else if (error.statusCode === 403) {
      // Permission errors
      toast.add({
        title: 'Permission Denied',
        description: 'You do not have permission to perform this action',
        color: 'error',
      });
    } else {
      // Generic server errors
      toast.add({
        title: 'Server Error',
        description: 'An unexpected error occurred. Please try again.',
        color: 'error',
      });
    }
  }
}
```

## Best Practices

### 1. Form State Management

```typescript
// ✅ Good: Centralized form state
const formState = reactive({
  data: {},
  errors: {},
  loading: false,
  dirty: false
});

// Track if form has been modified
watch(formState.data, () => {
  formState.dirty = true;
}, { deep: true });

// ❌ Bad: Scattered state
const form = ref({});
const errors = ref({});
const loading = ref(false);
// ... multiple separate refs
```

### 2. Schema Field Organization

```typescript
// ✅ Good: Use schema field ordering with custom includes
const visibleFields = computed(() => {
  const baseFields = ['name', 'email', 'description'];
  const conditionalFields = form.value.type === 'admin' ? ['permissions'] : [];
  return [...baseFields, ...conditionalFields];
});

<FormEditor :includes="visibleFields" ... />

// ❌ Bad: Manual field ordering that doesn't follow schema
```

### 3. Validation Timing

```typescript
// ✅ Good: Validate on submit, clear on input
async function handleSubmit() {
  const { isValid, errors } = validate(form.value);
  if (!isValid) {
    formErrors.value = errors;
    return;
  }
  // Continue with submission
}

// Clear errors as user types
watch(form, () => {
  if (Object.keys(formErrors.value).length > 0) {
    formErrors.value = {};
  }
}, { deep: true });

// ❌ Bad: Validate on every input change (annoying UX)
```

### 4. Loading States

```typescript
// ✅ Good: Comprehensive loading states
const loadingState = reactive({
  loading: false,      // Initial data load
  saving: false,       // Form submission
  validating: false,   // Custom async validation
});

// Update UI accordingly
const isDisabled = computed(() => 
  loadingState.loading || loadingState.saving || loadingState.validating
);
```

### 5. Form Cleanup

```typescript
// ✅ Good: Clean up resources
onUnmounted(() => {
  // Clear any pending validation timers
  if (validationTimeout.value) {
    clearTimeout(validationTimeout.value);
  }
  
  // Clear form state if needed
  formErrors.value = {};
});
```

## Integration with Global State

### Header Actions Integration

```typescript
// Register form-related header actions
useHeaderActionRegistry([
  {
    id: 'form-save',
    label: 'Save',
    icon: 'lucide:save',
    variant: 'solid',
    color: 'primary',
    submit: handleSubmit, // Calls form submit
    loading: computed(() => saveLoading.value),
    disabled: computed(() => !isDirty.value), // Disable if no changes
  },
  {
    id: 'form-reset',
    label: 'Reset',
    icon: 'lucide:rotate-ccw',
    variant: 'outline',
    onClick: resetForm,
    disabled: computed(() => !isDirty.value),
  },
]);
```

### Global Form Reference

```typescript
// For external form submission (e.g., from header buttons)
const { globalForm, globalFormLoading } = useGlobalState();

// Set loading state for header button
async function handleSubmit() {
  globalFormLoading.value = true;
  try {
    await processForm();
  } finally {
    globalFormLoading.value = false;
  }
}

// Submit form programmatically from header action
const submitFromHeader = () => {
  globalForm.value?.submit();
};
```

## Advanced Patterns

### 1. Multi-Step Forms

```typescript
const formSteps = ref([
  { key: 'basic', label: 'Basic Info', fields: ['name', 'email'] },
  { key: 'details', label: 'Details', fields: ['description', 'category'] },
  { key: 'settings', label: 'Settings', fields: ['isActive', 'priority'] },
]);

const currentStep = ref(0);
const currentFields = computed(() => formSteps.value[currentStep.value].fields);

// Validate current step
const validateStep = () => {
  const stepData = {};
  currentFields.value.forEach(field => {
    stepData[field] = form.value[field];
  });
  return validate(stepData);
};
```

### 2. Conditional Field Display

```typescript
// Show/hide fields based on other field values
const conditionalFields = computed(() => {
  const fields = ['name', 'email'];
  
  if (form.value.type === 'premium') {
    fields.push('premiumFeatures');
  }
  
  if (form.value.hasNotifications) {
    fields.push('notificationSettings');
  }
  
  return fields;
});

<FormEditor :includes="conditionalFields" ... />
```

### 3. Form Field Dependencies

```typescript
// Update field options based on other field values
const categoryOptions = computed(() => {
  if (form.value.type === 'product') {
    return [
      { label: 'Electronics', value: 'electronics' },
      { label: 'Clothing', value: 'clothing' }
    ];
  } else if (form.value.type === 'service') {
    return [
      { label: 'Consulting', value: 'consulting' },
      { label: 'Support', value: 'support' }
    ];
  }
  return [];
});

const typeMap = computed(() => ({
  category: {
    type: 'select',
    componentProps: {
      options: categoryOptions.value,
      disabled: !form.value.type
    }
  }
}));
```

This comprehensive form system provides everything needed to create robust, validated, and user-friendly forms in Enfyra App with seamless API integration and excellent developer experience.