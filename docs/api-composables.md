# useApiLazy Composable Guide

This guide explains how to use the `useApiLazy` composable for making API requests in the Enfyra App application.

## Overview

**⚠️ Important: This project is CSR (Client-Side Rendered) only. Always use `useApiLazy` instead of `useApi`.**

The `useApiLazy` composable provides a consistent interface for client-side API requests with:

- ✅ Automatic error handling with toast notifications
- ✅ Reactive loading states
- ✅ Full TypeScript support
- ✅ Dynamic ID support for CRUD operations
- ✅ Batch operations for multiple resources (PATCH/DELETE with IDs, POST with files)
- ✅ Manual execution control (never auto-executes)

### Why useApiLazy for CSR?

- **Client-Side Only**: Uses `$fetch` internally, perfect for CSR applications
- **Manual Control**: Never executes automatically, giving you full control over when API calls happen
- **No SSR Overhead**: Avoids SSR-related complexity and hydration issues
- **Better Performance**: Lighter than `useApi` for client-side only applications

## Basic Usage

```typescript
// Basic setup - always requires manual execution
// URL can be string or function for reactive paths
const { data, pending, error, execute } = useApiLazy("/users", {
  method: "get", 
  query: computed(() => ({
    limit: 10,
    sort: "-createdAt",
  })),
  errorContext: "Fetch Users",
});

// Use function for reactive/dynamic URLs
const userId = ref('123');
const { data, pending, error, execute } = useApiLazy(() => `/users/${userId.value}`, {
  errorContext: "Fetch User",
});

// Execute when needed (e.g., on component mount)
onMounted(async () => {
  await execute();
});

// Execute with dynamic parameters
await execute({ body: { name: "John" } });

// Execute with dynamic ID for single resource
await execute({ id: "123" });

// Execute with dynamic ID and body
await execute({ id: "123", body: { name: "Updated Name" } });

// Batch operations (patch/delete methods only)
await execute({ ids: ["1", "2", "3"] }); // Multiple IDs
await execute({ ids: ["1", "2"], body: { status: "inactive" } }); // Batch update

// Batch file upload (POST method only)
await execute({ files: [formData1, formData2, formData3] }); // Multiple files
```

## API Options

useApiLazy accepts the following options:

```typescript
interface UseApiOptions<T> {
  /** HTTP method for the request */
  method?: "get" | "post" | "patch" | "delete";

  /** Request body (for POST/PATCH requests) */
  body?: any | ComputedRef<any>;

  /** URL query parameters */
  query?: any | ComputedRef<any>;

  /** Context string for error messages (e.g., "Create User") */
  errorContext?: string;

  /** Disable batch operations for multiple IDs */
  disableBatch?: boolean;
}

// Execute options for dynamic parameters
interface ExecuteOptions {
  /** Request body for this execution */
  body?: any;

  /** Single ID for resource operations (appends to URL) */
  id?: string | number;

  /** Multiple IDs for batch operations (patch/delete only) */
  ids?: (string | number)[];

  /** Files array for batch POST operations (file uploads) */
  files?: any[];
}
```

### Available HTTP Methods

| Method   | Use Case                 | Body Support | Query Support | Batch Support |
| -------- | ------------------------ | ------------ | ------------- | ------------- |
| `get`    | Fetch data               | ❌ No        | ✅ Yes        | ❌ No         |
| `post`   | Create new resource      | ✅ Yes       | ✅ Yes        | ✅ Files only |
| `patch`  | Update existing resource | ✅ Yes       | ✅ Yes        | ✅ IDs        |
| `delete` | Remove resource          | ❌ No        | ✅ Yes        | ✅ IDs        |

### Return Types

```typescript
// useApiLazy returns the following interface
interface ApiComposableReturn<T> {
  /** Reactive data from the API response */
  data: Ref<T | null>;

  /** Reactive error state (readonly) */
  error: Readonly<Ref<any>>;

  /** Reactive loading state */
  pending: Ref<boolean>;

  /** Function to execute the API call */
  execute: (options?: ExecuteOptions) => Promise<T>;
}
```

## Error Handling

useApiLazy provides automatic error handling:

1. **Automatic Toast Notifications**: Errors are automatically displayed as toast notifications
2. **Error Context**: Provide `errorContext` to help users understand where the error occurred
3. **Error State**: Access error details via the `error` ref

```typescript
const { data, error, execute } = useApiLazy("/users", {
  errorContext: "Create User", // Shows "Create User: [error message]" in toast
});

// Check error state
if (error.value) {
  console.log("Error occurred:", error.value);
}
```

## Common Patterns

### URL Parameters

You can pass either a string (for static URLs) or a function (for reactive URLs):

```typescript
const userId = ref(1);

// ✅ Static URL - use string when path doesn't change
const { data } = useApiLazy("/users", {
  errorContext: "Fetch Users",
});

// ✅ Reactive URL - use function when path contains reactive values
const { data } = useApiLazy(() => `/users/${userId.value}`, {
  errorContext: "Fetch User",
});

// ❌ Wrong - static string with reactive value (won't update)
const { data } = useApiLazy(`/users/${userId.value}`, {
  errorContext: "Fetch User", 
});
```

### Computed Query/Body

Use computed refs for reactive query parameters:

```typescript
const page = ref(1);
const limit = ref(10);

const { data, execute } = useApiLazy("/users", {
  query: computed(() => ({
    page: page.value,
    limit: limit.value,
    sort: "-createdAt",
  })),
});

// When page changes, just re-execute
watch(page, async () => await execute());
```

### CRUD Operations

```typescript
// Define types first
interface User {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
}

interface ApiListResponse<T> {
  data: T[];
  meta: { totalCount: number };
}

interface ApiDetailResponse<T> {
  data: T;
}

// 1. READ - Fetch list with pagination  
const {
  data: usersData,
  pending,
  execute: fetchUsers,
} = useApiLazy<ApiListResponse<User>>("/users", {
  method: "get", // Default, but explicit is better
  query: computed(() => ({
    page: 1,
    limit: 10,
    sort: "-createdAt",
  })),
  errorContext: "Fetch Users",
});

// 2. CREATE - Add new user
const { execute: createUser, error: createError } = useApiLazy<
  ApiDetailResponse<User>
>("/users", {
  method: "post",
  errorContext: "Create User",
});

// 3. UPDATE - Modify existing user
const { execute: updateUser, error: updateError } = useApiLazy<
  ApiDetailResponse<User>
>("/users", {
  method: "patch",
  errorContext: "Update User",
});

// 4. DELETE - Remove user
const { execute: deleteUser, error: deleteError } = useApiLazy<{
  success: boolean;
}>("/users", {
  method: "delete",
  errorContext: "Delete User",
});

// Usage examples with proper types
async function handleCreateUser() {
  const newUser = await createUser({
    body: {
      name: "John Doe",
      email: "john@example.com",
      isActive: true,
    },
  });

  if (!createError.value) {
    console.log("Created user:", newUser.data);
  }
}

async function handleUpdateUser(userId: string) {
  await updateUser({
    id: userId,
    body: { name: "Updated Name" },
  });
}

async function handleDeleteUser(userId: string) {
  await deleteUser({ id: userId });
}

// Batch operations (only for patch/delete)
async function handleBulkDelete(userIds: string[]) {
  await deleteUser({ ids: userIds });
}

async function handleBulkDeactivate(userIds: string[]) {
  await updateUser({
    ids: userIds,
    body: { isActive: false },
  });
}
```

### Pagination

```typescript
const page = ref(1);
const limit = 10;

const {
  data: apiData,
  pending,
  execute,
} = useApiLazy("/users", {
  query: computed(() => ({
    page: page.value,
    limit,
    meta: "totalCount",
  })),
  errorContext: "Fetch Users",
});

// Computed values from API response
const users = computed(() => apiData.value?.data || []);
const total = computed(() => apiData.value?.meta?.totalCount || 0);

// Watch page changes
watch(page, async () => await execute());

// Initial fetch
onMounted(async () => await execute());
```

## Batch Operations

### Batch Delete/Patch with Multiple IDs

`useApiLazy` hỗ trợ batch operations cho `patch` và `delete` methods:

```typescript
// Batch delete multiple users
const { execute: deleteUsers } = useApiLazy("/user_definition", {
  method: "delete",
  errorContext: "Delete Users",
});

// Delete multiple users at once
await deleteUsers({ ids: ["1", "2", "3"] });

// Batch update multiple roles
const { execute: updateRoles } = useApiLazy("/role_definition", {
  method: "patch",
  errorContext: "Update Roles",
});

// Update multiple roles with same data
await updateRoles({
  ids: ["role1", "role2"],
  body: { isActive: true },
});
```

**Important Notes:**

- Only supports `patch` and `delete` methods
- Uses `Promise.all` for parallel execution
- Returns array of responses
- Does not support `get` methods with batch IDs

### Batch POST for File Uploads

`useApiLazy` cũng hỗ trợ batch POST operations cho file uploads:

```typescript
// Batch file upload
const { execute: uploadFiles } = useApiLazy("/file_definition", {
  method: "post",
  errorContext: "Upload Files",
});

// Upload multiple files with different metadata
await uploadFiles({
  files: [
    // Each file should be a FormData object
    createFileFormData(file1, folderId1),
    createFileFormData(file2, folderId2),
    createFileFormData(file3, folderId3),
  ],
});

// Helper function to create FormData for each file
function createFileFormData(file: File, folderId: string | null) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", folderId || "");
  return formData;
}
```

**File Upload Notes:**

- Uses `executeOpts.files` array for batch POST
- Each item in `files` array should be a `FormData` object
- Supports parallel upload with `Promise.all`
- Perfect for bulk file upload scenarios

## Best Practices

### 1. Always Use at Setup Level

```typescript
// ✅ Correct - at setup level with dynamic ID support
const { execute: deleteItem } = useApiLazy(() => `/items`, {
  method: "delete",
  errorContext: "Delete Item",
});

async function handleDelete(id: string) {
  await deleteItem({ id });
}

// ❌ Wrong - inside function (violates Composition API rules)
async function handleDelete(id: string) {
  const { execute } = useApiLazy(() => `/items/${id}`, {
    method: "delete",
  });
  await execute();
}
```

**Why this matters:**

- **Composition API Rules**: Composables must be called at setup level
- **Performance**: Avoids creating new reactive instances on every call
- **Reactivity**: Proper reactive state management
- **Memory**: Prevents memory leaks from uncleaned reactive instances

### 2. Never Use Try-Catch

**❌ WRONG - Don't do this:**

```typescript
async function deleteUser() {
  try {
    await executeDeleteUser();
    toast.add({ title: "Success", color: "success" });
  } catch (error) {
    // ❌ This is wrong! Error handling is already automatic
    console.log("Error:", error);
  }
}
```

**✅ CORRECT - Do this instead:**

```typescript
async function deleteUser() {
  await executeDeleteUser();

  // Check error state if needed
  if (deleteError.value) {
    return; // Error already handled by useApiLazy
  }

  toast.add({ title: "Success", color: "success" });
}
```

**✅ EVEN BETTER - With dynamic ID:**

```typescript
const { execute: deleteUserApi, error: deleteError } = useApiLazy(
  () => "/users",
  {
    method: "delete",
    errorContext: "Delete User",
  }
);

async function deleteUser(userId: string) {
  await deleteUserApi({ id: userId });

  if (deleteError.value) {
    return; // Error toast already shown
  }

  toast.add({ title: "Success", color: "success" });
}
```

**Why no try-catch?**

- **Automatic Error Handling**: useApiLazy automatically handles errors and shows toast notifications
- **Error State Management**: Use `error.value` to check if an error occurred
- **Cleaner Code**: No need for try-catch blocks that don't add value
- **Consistent UX**: All errors are handled the same way across the application

**Example with proper error checking:**

```typescript
async function updateUser() {
  await executeUpdateUser();

  if (updateError.value) {
    // Error already handled by useApiLazy
    return;
  }

  // Success case
  toast.add({ title: "User updated", color: "success" });
  router.push("/users");
}
```

### 3. Provide Error Context

Always include `errorContext` for better error messages:

```typescript
const { execute } = useApiLazy("/users", {
  method: "post",
  errorContext: "Create User", // User sees: "Create User: Network error"
});
```

### 4. Handle Loading States

```vue
<template>
  <LoadingState v-if="pending" />
  <div v-else>
    <!-- Content -->
  </div>
</template>

<script setup>
const { data, pending, execute } = useApiLazy("/users", {
  errorContext: "Fetch Users",
});

onMounted(async () => await execute());
</script>
```

### 5. Type Safety

Define interfaces for your API responses to get full TypeScript support:

```typescript
// Define your data models
interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  role?: {
    id: string;
    name: string;
  };
}

// Define API response structure
interface ApiResponse<T> {
  data: T[];
  meta?: {
    totalCount: number;
    page: number;
    limit: number;
  };
}

// Use with full type safety
const { data, execute } = useApiLazy<ApiResponse<User>>(() => "/users", {
  method: "get",
  errorContext: "Fetch Users",
});

// TypeScript knows data.value is ApiResponse<User> | null
const users = computed(() => data.value?.data || []);
const total = computed(() => data.value?.meta?.totalCount || 0);

// For single resource operations
interface SingleApiResponse<T> {
  data: T;
}

const { execute: createUser } = useApiLazy<SingleApiResponse<User>>(
  () => "/users",
  {
    method: "post",
    errorContext: "Create User",
  }
);

// TypeScript enforces correct body structure
await createUser({
  body: {
    name: "John Doe",
    email: "john@example.com",
  },
});
```

### Common API Response Patterns

```typescript
// List endpoints (GET /users)
interface ListResponse<T> {
  data: T[];
  meta: {
    totalCount: number;
    page: number;
    limit: number;
  };
}

// Single resource endpoints (GET /users/123)
interface DetailResponse<T> {
  data: T;
}

// Create/Update endpoints (POST/PATCH /users)
interface MutationResponse<T> {
  data: T;
  message?: string;
}

// Delete endpoints (DELETE /users/123)
interface DeleteResponse {
  success: boolean;
  message?: string;
}
```

### 6. Use Batch Operations Wisely

````typescript
// ✅ Good - batch delete multiple items
const { execute: deleteItems } = useApiLazy("/items", {
  method: "delete",
  errorContext: "Delete Items",
});

async function bulkDelete(selectedIds: string[]) {
  await deleteItems({ ids: selectedIds });

  if (deleteError.value) {
    return;
  }

  toast.add({ title: `${selectedIds.length} items deleted`, color: "success" });
}

// ✅ Good - batch update with same data
const { execute: updateItems } = useApiLazy("/items", {
  method: "patch",
  errorContext: "Update Items",
});

async function bulkActivate(selectedIds: string[]) {
  await updateItems({
    ids: selectedIds,
    body: { isActive: true },
  });
}

// ✅ Good - batch file upload
const { execute: uploadFiles } = useApiLazy("/file_definition", {
  method: "post",
  errorContext: "Upload Files",
});

async function bulkUpload(files: File[], folderId: string | null) {
  const fileFormDataArray = files.map(file => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", folderId || "");
    return formData;
  });

  await uploadFiles({ files: fileFormDataArray });

  if (uploadError.value) {
    return;
  }

  toast.add({ title: `${files.length} files uploaded`, color: "success" });
}

**Batch Limitations:**

- **PATCH/DELETE**: Only works with `patch` and `delete` methods using `ids`
- **POST**: Only works with `post` method using `files` array for file uploads
- **PATCH**: All items get the same body data
- **POST**: Each file can have different metadata via FormData
- Not suitable for different data per item in PATCH operations

## Migration from Direct $fetch

If you're migrating from direct `$fetch` usage:

```typescript
// ❌ Before - manual $fetch with lots of boilerplate
async function fetchUsers() {
  try {
    loading.value = true;
    const response = await $fetch("/api/users");
    users.value = response.data;
  } catch (error) {
    toast.add({ title: "Error", description: error.message });
  } finally {
    loading.value = false;
  }
}

// ✅ After - clean useApiLazy approach
const { data, pending, execute } = useApiLazy<ApiResponse<User>>(
  () => "/users",
  {
    errorContext: "Fetch Users",
  }
);

const users = computed(() => data.value?.data || []);

// Execute when needed
onMounted(() => execute());
````

**Benefits of Migration:**

1. ✅ **No boilerplate** - Automatic error handling and loading states
2. ✅ **Type safety** - Full TypeScript support
3. ✅ **Consistent UX** - Standardized error messages
4. ✅ **Reactive data** - Automatic reactivity updates
5. ✅ **Better DX** - Cleaner, more maintainable code

## Troubleshooting

### Common Issues

1. **"path is not a function" error**

   - Use string for static URLs: `"/endpoint"` 
   - Use function for reactive URLs: `() => "/endpoint"` with reactive values

2. **Changes not reactive**

   - Use computed refs for dynamic query/body
   - Ensure path function accesses reactive values

3. **Unexpected executions**

   - useApiLazy never auto-executes, only when you call `execute()`
   - Check if you're calling execute in multiple places

4. **TypeScript errors**

   - Use `pending` not `loading` in destructuring
   - Ensure composables are at setup level

5. **Composable called inside function**

   - Move all composables to setup level
   - Use dynamic IDs with `{ id }` parameter instead

6. **Error handling not working**
   - Don't use try-catch blocks
   - Check `error.value` instead of catching exceptions

### Common Anti-Patterns

```typescript
// ❌ Don't do these:
async function badFunction(id: string) {
  // Anti-pattern 1: Composable inside function
  const { execute } = useApiLazy(() => `/items/${id}`, {...});

  try {
    // Anti-pattern 2: Unnecessary try-catch
    await execute();
  } catch (err) {
    // Anti-pattern 3: Manual error handling
    toast.add({ title: "Error", description: err.message });
  }
}

// ✅ Do this instead:
const { execute: deleteItem, error } = useApiLazy("/items", {
  method: "delete",
  errorContext: "Delete Item",
});

async function goodFunction(id: string) {
  await deleteItem({ id });

  if (error.value) {
    return; // Error already handled automatically
  }

  // Success handling only
  toast.add({ title: "Success" });
}
```

## Summary

**For this CSR application, always use `useApiLazy`:**

- ✅ Perfect for client-side only applications
- ✅ Manual execution control prevents unexpected API calls
- ✅ Automatic error handling with toast notifications
- ✅ Full TypeScript support with proper typing
- ✅ Dynamic ID support for flexible CRUD operations
- ✅ Batch operations for efficient bulk actions (PATCH/DELETE with IDs, POST with files)

**Key Rules:**

- Always provide `errorContext` for better error messages
- Keep composables at setup level, never inside functions
- Use computed refs for reactive parameters
- Check `error.value` instead of using try-catch
- Use dynamic IDs with `{ id }` parameter for flexibility
