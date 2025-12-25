<template>
  <div class="space-y-6">
    <div class="max-w-[1200px] lg:max-w-[1200px] md:w-full space-y-6">
      <CommonFormCard v-if="mainTableInfo">
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="lucide:database" class="w-5 h-5 text-primary-600 dark:text-primary-400" />
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Main Table</h3>
          </div>
        </template>
        <div class="p-4 rounded-lg border border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/20">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-lg bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center">
              <UIcon name="lucide:table" class="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
            <div class="flex-1">
              <p class="text-sm text-gray-600 dark:text-gray-400 mb-1">This route is the main route for table:</p>
              <h4 class="text-base font-semibold text-gray-900 dark:text-white">
                {{ mainTableInfo.name || mainTableInfo.tableName || 'Unknown Table' }}
              </h4>
              <p v-if="mainTableInfo.description" class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {{ mainTableInfo.description }}
              </p>
            </div>
            <UBadge size="lg" variant="soft" color="primary">
              Main Route
            </UBadge>
          </div>
        </div>
      </CommonFormCard>

      <CommonFormCard>
        <UForm :state="form" @submit="updateRoute">
          <FormEditorLazy
            ref="formEditorRef"
            v-model="form"
            v-model:errors="errors"
            @has-changed="(hasChanged) => hasFormChanges = hasChanged"
            :table-name="tableName"
            :excluded="['routePermissions', 'mainTable', 'handlers', 'hooks', 'preHook', 'postHook']"
            :field-map="typeMap"
            :loading="loading"
          />
        </UForm>
      </CommonFormCard>

      <RouteExecutionFlowVisualization
        v-if="routeData?.data?.[0]"
        :route-data="routeData"
        :handlers="displayHandlers"
        :sorted-pre-hooks="sortedPreHooks"
        :sorted-after-hooks="sortedAfterHooks"
        :get-pre-hook-priority="getPreHookPriority"
        :get-after-hook-priority="getAfterHookPriority"
        :get-id="getId"
        :has-main-table="!!mainTableInfo"
        :default-handler="defaultHandler"
        @edit-handler="editHandler"
        @edit-hook="editHook"
        @create-handler="createHandler"
        @create-hook="createHook"
        @delete-handler="deleteHandler"
        @delete-hook="deleteHook"
        @toggle-hook="toggleHook"
      />

      <CommonFormCard>
        <PermissionManager
          table-name="route_permission_definition"
          :current-field-id="{ field: 'route', value: route.params.id as string }"
          icon="lucide:shield"
          title="Route Permissions"
        />
      </CommonFormCard>
    </div>
  </div>

  <RouteCreateHandlerDrawer
    v-model="showCreateHandlerDrawer"
    v-model:form="handlerForm"
    v-model:errors="handlerErrors"
    :loading="createHandlerLoading"
    @save="saveHandler"
    @cancel="handleCancelHandler"
  />

  <RouteCreateHookDrawer
    v-model="showCreateHookDrawer"
    v-model:form="hookForm"
    v-model:errors="hookErrors"
    :loading="createHookLoading"
    :hook-type="hookType || 'pre'"
    :route-id="routeId"
    @save="saveHook"
    @cancel="handleCancelHook"
  />

  <RouteEditHandlerDrawer
    v-model="showEditHandlerDrawer"
    v-model:form="editHandlerForm"
    v-model:errors="editHandlerErrors"
    :loading="updateHandlerLoading"
    @save="updateHandler"
    @cancel="handleCancelEditHandler"
  />

  <RouteEditHookDrawer
    v-model="showEditHookDrawer"
    v-model:form="editHookForm"
    v-model:errors="editHookErrors"
    :loading="updateHookLoading"
    :hook-type="editHookType || 'pre'"
    :route-id="routeId"
    @save="updateHook"
    @cancel="handleCancelEditHook"
  />

  <CommonEmptyState
    v-if="!loading && !routeData?.data?.[0]"
    title="Route not found"
    description="The requested route could not be loaded"
    icon="lucide:route"
    size="sm"
  />
</template>

<script setup lang="ts">
const route = useRoute();
const router = useRouter();
const toast = useToast();
const { confirm } = useConfirm();
const { loadRoutes } = useRoutes();
const { getId } = useDatabase();

const tableName = "route_definition";
const hasFormChanges = ref(false);
const formEditorRef = ref();
const { useFormChanges } = useSchema();
const formChanges = useFormChanges();

const { validate, getIncludeFields, schemas } = useSchema(tableName);
const { getIncludeFields: getPreHookIncludeFields } = useSchema("pre_hook_definition");
const { getIncludeFields: getPostHookIncludeFields } = useSchema("post_hook_definition");
const { getIncludeFields: getHandlerIncludeFields } = useSchema("route_handler_definition");
const { registerPageHeader } = usePageHeaderRegistry();

registerPageHeader({
  title: "Route Details",
  gradient: "cyan",
});

const typeMap = ref<Record<string, any>>({});

const routeId = computed(() => route.params.id as string);

useHeaderActionRegistry([
  {
    id: "reset-routing",
    label: "Reset",
    icon: "lucide:rotate-ccw",
    variant: "outline",
    color: "warning",
    size: "md",
    order: 1,
    disabled: computed(() => !hasFormChanges.value),
    onClick: handleReset,
    show: computed(() => hasFormChanges.value),
  },
  {
    id: "delete-routing",
    label: "Delete",
    icon: "lucide:trash",
    variant: "solid",
    color: "error",
    size: "md",
    order: 3,
    onClick: deleteRoute,
    loading: computed(() => deleteLoading.value),
    permission: {
      and: [
        {
          route: "/route_definition",
          actions: ["delete"],
        },
      ],
    },
  },
  {
    id: "save-routing",
    label: "Save",
    icon: "lucide:save",
    variant: "solid",
    color: "primary",
    size: "md",
    order: 2,
    submit: updateRoute,
    loading: computed(() => updateLoading.value),
    disabled: computed(() => !hasFormChanges.value),
    permission: {
      and: [
        {
          route: "/route_definition",
          actions: ["update"],
        },
      ],
    },
  },
]);

const {
  data: routeData,
  pending: loading,
  execute: executeGetRoute,
} = useApi(`/${tableName}`, {
  query: {
    fields: getIncludeFields(),
    filter: { id: { _eq: route.params.id } },
  },
  errorContext: "Fetch Route",
});

watch(() => routeData.value?.data?.[0]?.path, (path) => {
  if (path) {
    registerPageHeader({
      title: `Route: ${path}`,
      gradient: "cyan",
    });
  }
}, { immediate: true });

watch(() => routeData.value?.data?.[0], (currentRoute) => {
  if (!currentRoute) return;

  let hasAssociatedTable = false;
  if (currentRoute.mainTable) {
    const mainTableId = getId(currentRoute.mainTable);
    if (mainTableId) {
      hasAssociatedTable = Object.values(schemas.value).some(
        (table: any) => String(getId(table)) === String(mainTableId)
      );
    }
  }

  typeMap.value = {
    isEnabled: {
      disabled: hasAssociatedTable
    }
  };
}, { immediate: true });

const {
  error: updateError,
  execute: executeUpdateRoute,
  pending: updateLoading,
} = useApi(`/${tableName}`, {
  method: "patch",
  errorContext: "Update Route",
});

const {
  error: deleteError,
  execute: executeDeleteRoute,
  pending: deleteLoading,
} = useApi(`/${tableName}`, {
  method: "delete",
  errorContext: "Delete Route ",
});

const form = ref<Record<string, any>>({});

const errors = ref<Record<string, string>>({});

async function initializeForm() {
  await executeGetRoute();
  const data = routeData.value?.data?.[0];
  if (data) {
    form.value = { ...data };
    formChanges.update(data);
  }
}

async function updateRoute() {
  if (!form.value) return;

  const { isValid, errors: validationErrors } = validate(form.value);
  if (!isValid) {
    errors.value = validationErrors;
    toast.add({
      title: "Missing information",
      description: "Please fill in all required fields.",
      color: "error",
    });
    return;
  }

  await executeUpdateRoute({
    id: route.params.id as string,
    body: form.value,
  });

  if (updateError.value) {
    return;
  }

  toast.add({
    title: "Success",
    color: "success",
    description: "Route updated!",
  });
  errors.value = {};

  await loadRoutes();

  const { registerDataMenuItems } = useMenuRegistry();
  await registerDataMenuItems(Object.values(schemas.value));

  formEditorRef.value?.confirmChanges();
  formChanges.update(form.value);
}

async function handleReset() {
  const ok = await confirm({
    title: "Reset Changes",
    content: "Are you sure you want to discard all changes? All modifications will be lost.",
  });
  if (!ok) {
    return;
  }

  if (formChanges.originalData.value) {
    form.value = formChanges.discardChanges(form.value);
    hasFormChanges.value = false;

    toast.add({
      title: "Reset Complete",
      color: "success",
      description: "All changes have been discarded.",
    });
  }
}

async function deleteRoute() {
  const ok = await confirm({
    title: "Are you sure?",
    content: "This action cannot be undone.",
  });
  if (!ok) return;

  await executeDeleteRoute({ id: route.params.id as string });

  if (deleteError.value) {
    return;
  }

  toast.add({ 
    title: "Success",
    description: "Route deleted successfully", 
    color: "success" 
  });

  await loadRoutes();

  const { registerDataMenuItems } = useMenuRegistry();
  await registerDataMenuItems(Object.values(schemas.value));
  
  await navigateTo("/settings/routings");
}

const {
  data: handlersData,
  pending: handlersLoading,
  execute: fetchHandlers,
} = useApi(() => "/route_handler_definition", {
  query: computed(() => ({
    fields: getHandlerIncludeFields(),
    filter: {
      route: { id: { _eq: routeId.value } },
    },
  })),
  errorContext: "Fetch Handlers",
});

const {
  data: preHooksData,
  pending: preHooksLoading,
  execute: fetchPreHooks,
} = useApi(() => "/pre_hook_definition", {
  query: computed(() => ({
    fields: getPreHookIncludeFields(),
    filter: {
      route: { id: { _eq: routeId.value } },
    },
    sort: ["priority"],
  })),
  errorContext: "Fetch Pre-Hooks",
});

const {
  data: postHooksData,
  pending: postHooksLoading,
  execute: fetchPostHooks,
} = useApi(() => "/post_hook_definition", {
  query: computed(() => ({
    fields: getPostHookIncludeFields(),
    filter: {
      route: { id: { _eq: routeId.value } },
    },
    sort: ["priority"],
  })),
  errorContext: "Fetch Post-Hooks",
});

const {
  data: globalPreHooksData,
  pending: globalPreHooksLoading,
  execute: fetchGlobalPreHooks,
} = useApi(() => "/pre_hook_definition", {
  query: computed(() => ({
    fields: getPreHookIncludeFields(),
    filter: {
      isGlobal: { _eq: true },
    },
    sort: ["priority"],
  })),
  errorContext: "Fetch Global Pre-Hooks",
});

const {
  data: globalPostHooksData,
  pending: globalPostHooksLoading,
  execute: fetchGlobalPostHooks,
} = useApi(() => "/post_hook_definition", {
  query: computed(() => ({
    fields: getPostHookIncludeFields(),
    filter: {
      isGlobal: { _eq: true },
    },
    sort: ["priority"],
  })),
  errorContext: "Fetch Global Post-Hooks",
});

const handlers = computed(() => handlersData.value?.data || []);
const routePreHooks = computed(() => preHooksData.value?.data || []);
const routePostHooks = computed(() => postHooksData.value?.data || []);
const globalPreHooks = computed(() => globalPreHooksData.value?.data || []);
const globalPostHooks = computed(() => globalPostHooksData.value?.data || []);

const preHooks = computed(() => [...routePreHooks.value, ...globalPreHooks.value]);
const postHooks = computed(() => [...routePostHooks.value, ...globalPostHooks.value]);

const mainTableInfo = computed(() => {
  const route = routeData.value?.data?.[0];
  if (!route?.mainTable) return null;
  
  const mainTableId = getId(route.mainTable);
  const tableSchema = Object.values(schemas.value).find((schema: any) => {
    const schemaId = getId(schema);
    return schemaId === mainTableId;
  });
  
  return tableSchema || route.mainTable;
});

const defaultHandler = computed(() => {
  if (!mainTableInfo.value || handlers.value.length > 0) return null;
  
  return {
    _isDefault: true,
    name: `Default handler for ${mainTableInfo.value.name || mainTableInfo.value.tableName || 'table'}`,
    description: 'This is a default handler. Click to create a custom handler.',
  };
});

const displayHandlers = computed(() => {
  if (defaultHandler.value) {
    return [defaultHandler.value];
  }
  return handlers.value;
});

const allHooks = computed(() => [
  ...preHooks.value.map((hook: any) => ({ ...hook, _hookType: 'pre' })),
  ...postHooks.value.map((hook: any) => ({ ...hook, _hookType: 'post' })),
]);

const sortedPreHooks = computed(() => {
  return [...preHooks.value].sort((a: any, b: any) => (a.priority || 0) - (b.priority || 0));
});

const sortedAfterHooks = computed(() => {
  return [...postHooks.value].sort((a: any, b: any) => (a.priority || 0) - (b.priority || 0));
});

function hasPreHook(hook: any): boolean {
  return hook._hookType === 'pre';
}

function hasAfterHook(hook: any): boolean {
  return hook._hookType === 'post';
}

function getPreHookPriority(hook: any): number | null {
  return hook.priority ?? null;
}

function getAfterHookPriority(hook: any): number | null {
  return hook.priority ?? null;
}

const hooksLoading = computed(() => preHooksLoading.value || postHooksLoading.value || globalPreHooksLoading.value || globalPostHooksLoading.value);

const showCreateHandlerDrawer = ref(false);
const handlerForm = ref<Record<string, any>>({});
const handlerErrors = ref<Record<string, string>>({});

const { generateEmptyForm: generateHandlerEmptyForm, validate: validateHandler } = useSchema("route_handler_definition");

const {
  data: createHandlerData,
  error: createHandlerError,
  execute: executeCreateHandler,
  pending: createHandlerLoading,
} = useApi(() => `/route_handler_definition`, {
  method: "post",
  errorContext: "Create Handler",
});

const isHandlerDrawerUpdatingFromRoute = ref(false);

watch(() => route.query.createHandler, (value) => {
  const shouldOpen = value === 'true';
  if (showCreateHandlerDrawer.value !== shouldOpen) {
    isHandlerDrawerUpdatingFromRoute.value = true;
    showCreateHandlerDrawer.value = shouldOpen;
    if (shouldOpen) {
      handlerForm.value = generateHandlerEmptyForm();
      handlerForm.value.route = { id: routeId.value };
      handlerErrors.value = {};
    } else {
      handlerForm.value = {};
      handlerErrors.value = {};
    }
    nextTick(() => {
      isHandlerDrawerUpdatingFromRoute.value = false;
    });
  }
}, { immediate: true });

watch(showCreateHandlerDrawer, (isOpen) => {
  if (isHandlerDrawerUpdatingFromRoute.value) return;
  
  if (isOpen) {
    router.push({
      query: { ...route.query, createHandler: 'true' }
    });
  } else {
    const newQuery = { ...route.query };
    delete newQuery.createHandler;
    router.replace({ query: newQuery });
  }
});

function createHandler() {
  handlerForm.value = generateHandlerEmptyForm();
  handlerForm.value.route = { id: routeId.value };
  handlerErrors.value = {};
  showCreateHandlerDrawer.value = true;
}

function handleCancelHandler() {
  showCreateHandlerDrawer.value = false;
}

async function saveHandler() {
  const { isValid, errors } = validateHandler(handlerForm.value);

  if (!isValid) {
    handlerErrors.value = errors;
    toast.add({
      title: "Validation error",
      description: "Please check the fields with errors.",
      color: "error",
    });
    return;
  }

  await executeCreateHandler({ body: handlerForm.value });

  if (createHandlerError.value) {
    return;
  }

  toast.add({
    title: "Handler created successfully",
    color: "success",
  });

  showCreateHandlerDrawer.value = false;
  await fetchHandlers();
}

const showEditHandlerDrawer = ref(false);
const editHandlerForm = ref<Record<string, any>>({});
const editHandlerErrors = ref<Record<string, string>>({});
const editingHandlerId = ref<string | null>(null);

const {
  error: updateHandlerError,
  execute: executeUpdateHandler,
  pending: updateHandlerLoading,
} = useApi(() => `/route_handler_definition`, {
  method: "patch",
  errorContext: "Update Handler",
});

const {
  data: editHandlerData,
  pending: editHandlerLoading,
  execute: fetchEditHandler,
} = useApi(() => `/route_handler_definition`, {
  query: computed(() => ({
    fields: getHandlerIncludeFields(),
    filter: { id: { _eq: editingHandlerId.value } },
  })),
  errorContext: "Fetch Handler",
  immediate: false,
});

watch(editHandlerData, (data) => {
  if (data?.data?.[0]) {
    editHandlerForm.value = { ...data.data[0] };
  }
});

const isEditHandlerDrawerUpdatingFromRoute = ref(false);

watch(() => route.query.editHandler, async (value) => {
  if (value && typeof value === 'string') {
    if (editingHandlerId.value !== value) {
      isEditHandlerDrawerUpdatingFromRoute.value = true;
      editingHandlerId.value = value;
      editHandlerErrors.value = {};
      await fetchEditHandler();
      showEditHandlerDrawer.value = true;
      nextTick(() => {
        isEditHandlerDrawerUpdatingFromRoute.value = false;
      });
    }
  } else if (!value && showEditHandlerDrawer.value) {
    isEditHandlerDrawerUpdatingFromRoute.value = true;
    showEditHandlerDrawer.value = false;
    editingHandlerId.value = null;
    editHandlerForm.value = {};
    editHandlerErrors.value = {};
    nextTick(() => {
      isEditHandlerDrawerUpdatingFromRoute.value = false;
    });
  }
}, { immediate: true });

watch(showEditHandlerDrawer, (isOpen) => {
  if (isEditHandlerDrawerUpdatingFromRoute.value) return;
  
  if (isOpen && editingHandlerId.value) {
    router.push({
      query: { ...route.query, editHandler: editingHandlerId.value }
    });
  } else {
    const newQuery = { ...route.query };
    delete newQuery.editHandler;
    router.replace({ query: newQuery });
  }
});

async function editHandler(handler: any) {
  if (handler._isDefault) {
    createHandler();
    return;
  }
  
  editingHandlerId.value = getId(handler);
  editHandlerErrors.value = {};
  await fetchEditHandler();
  showEditHandlerDrawer.value = true;
}

function handleCancelEditHandler() {
  showEditHandlerDrawer.value = false;
}

async function updateHandler() {
  if (!editingHandlerId.value || !editHandlerForm.value) return;

  const { isValid, errors } = validateHandler(editHandlerForm.value);

  if (!isValid) {
    editHandlerErrors.value = errors;
    toast.add({
      title: "Validation error",
      description: "Please check the fields with errors.",
      color: "error",
    });
    return;
  }

  await executeUpdateHandler({
    id: editingHandlerId.value,
    body: editHandlerForm.value,
  });

  if (updateHandlerError.value) {
    return;
  }

  toast.add({
    title: "Handler updated successfully",
    color: "success",
  });

  showEditHandlerDrawer.value = false;
  await fetchHandlers();
}

const { execute: deleteHandlerApi, error: deleteHandlerError } = useApi(
  () => `/route_handler_definition`,
  {
    method: "delete",
    errorContext: "Delete Handler",
  }
);

async function deleteHandler(handler: any) {
  const isConfirmed = await confirm({
    title: "Delete Handler",
    content: `Are you sure you want to delete handler "${handler.name || "Unnamed"}"? This action cannot be undone.`,
    confirmText: "Delete",
    cancelText: "Cancel",
  });

  if (!isConfirmed) return;

  await deleteHandlerApi({ id: getId(handler) });

  if (deleteHandlerError.value) {
    return;
  }

  toast.add({
    title: "Success",
    description: "Handler deleted successfully",
    color: "success",
  });

  await fetchHandlers();
}

const showCreateHookDrawer = ref(false);
const hookForm = ref<Record<string, any>>({});
const hookErrors = ref<Record<string, string>>({});

const { generateEmptyForm: generatePreHookEmptyForm, validate: validatePreHook } = useSchema("pre_hook_definition");
const { generateEmptyForm: generatePostHookEmptyForm, validate: validatePostHook } = useSchema("post_hook_definition");

const {
  data: createPreHookData,
  error: createPreHookError,
  execute: executeCreatePreHook,
  pending: createPreHookLoading,
} = useApi(() => `/pre_hook_definition`, {
  method: "post",
  errorContext: "Create Pre-Hook",
});

const {
  data: createPostHookData,
  error: createPostHookError,
  execute: executeCreatePostHook,
  pending: createPostHookLoading,
} = useApi(() => `/post_hook_definition`, {
  method: "post",
  errorContext: "Create Post-Hook",
});

const createHookLoading = computed(() => createPreHookLoading.value || createPostHookLoading.value);

const isHookDrawerUpdatingFromRoute = ref(false);

watch(() => route.query.createHook, (value) => {
  const shouldOpen = value === 'true' || value === 'pre' || value === 'post';
  if (showCreateHookDrawer.value !== shouldOpen) {
    isHookDrawerUpdatingFromRoute.value = true;
    showCreateHookDrawer.value = shouldOpen;
    if (shouldOpen) {
      const hookType = value === 'pre' ? 'pre' : value === 'post' ? 'post' : null;
      if (hookType === 'pre') {
        hookForm.value = generatePreHookEmptyForm();
      } else if (hookType === 'post') {
        hookForm.value = generatePostHookEmptyForm();
      } else {
        hookForm.value = generatePreHookEmptyForm(); // default to pre
      }
      hookForm.value.route = { id: routeId.value };
      hookErrors.value = {};
    } else {
      hookForm.value = {};
      hookErrors.value = {};
    }
    nextTick(() => {
      isHookDrawerUpdatingFromRoute.value = false;
    });
  }
}, { immediate: true });

watch(showCreateHookDrawer, (isOpen) => {
  if (isHookDrawerUpdatingFromRoute.value) return;
  
  if (isOpen) {
    const hookTypeParam = hookType.value || 'pre';
    router.push({
      query: { ...route.query, createHook: hookTypeParam }
    });
  } else {
    const newQuery = { ...route.query };
    delete newQuery.createHook;
    router.replace({ query: newQuery });
  }
});

const hookType = ref<'pre' | 'post' | null>(null);

function createHook(type?: 'pre' | 'post') {
  hookType.value = type || 'pre';
  if (hookType.value === 'pre') {
    hookForm.value = generatePreHookEmptyForm();
  } else {
    hookForm.value = generatePostHookEmptyForm();
  }
  hookForm.value.route = { id: routeId.value };
  hookErrors.value = {};
  showCreateHookDrawer.value = true;
}

function handleCancelHook() {
  showCreateHookDrawer.value = false;
}

async function saveHook() {
  const isPreHook = hookType.value === 'pre';
  const validate = isPreHook ? validatePreHook : validatePostHook;
  const { isValid, errors } = validate(hookForm.value);

  if (!isValid) {
    hookErrors.value = errors;
    toast.add({
      title: "Validation error",
      description: "Please check the fields with errors.",
      color: "error",
    });
    return;
  }

  const hookData = { ...hookForm.value };

  if (isPreHook) {
    await executeCreatePreHook({ body: hookData });
    if (createPreHookError.value) {
      return;
    }
  } else {
    await executeCreatePostHook({ body: hookData });
    if (createPostHookError.value) {
      return;
    }
  }

  toast.add({
    title: `${isPreHook ? 'Pre' : 'Post'}-Hook created successfully`,
    color: "success",
  });

  showCreateHookDrawer.value = false;
  await Promise.all([fetchPreHooks(), fetchPostHooks(), fetchGlobalPreHooks(), fetchGlobalPostHooks()]);
}

const showEditHookDrawer = ref(false);
const editHookForm = ref<Record<string, any>>({});
const editHookErrors = ref<Record<string, string>>({});
const editingHookId = ref<string | null>(null);
const editHookType = ref<'pre' | 'post' | null>(null);

const {
  error: updatePreHookError,
  execute: executeUpdatePreHook,
  pending: updatePreHookLoading,
} = useApi(() => `/pre_hook_definition`, {
  method: "patch",
  errorContext: "Update Pre-Hook",
});

const {
  error: updatePostHookError,
  execute: executeUpdatePostHook,
  pending: updatePostHookLoading,
} = useApi(() => `/post_hook_definition`, {
  method: "patch",
  errorContext: "Update Post-Hook",
});

const updateHookLoading = computed(() => updatePreHookLoading.value || updatePostHookLoading.value);
const updateHookError = computed(() => updatePreHookError.value || updatePostHookError.value);

const {
  data: editPreHookData,
  pending: editPreHookLoading,
  execute: fetchEditPreHook,
} = useApi(() => `/pre_hook_definition`, {
  query: computed(() => ({
    fields: getPreHookIncludeFields(),
    filter: { id: { _eq: editingHookId.value ? String(editingHookId.value) : null } },
  })),
  errorContext: "Fetch Pre-Hook",
  immediate: false,
});

const {
  data: editPostHookData,
  pending: editPostHookLoading,
  execute: fetchEditPostHook,
} = useApi(() => `/post_hook_definition`, {
  query: computed(() => ({
    fields: getPostHookIncludeFields(),
    filter: { id: { _eq: editingHookId.value ? String(editingHookId.value) : null } },
  })),
  errorContext: "Fetch Post-Hook",
  immediate: false,
});


const isEditHookDrawerUpdatingFromRoute = ref(false);

watch(() => [route.query.editHook, route.query.editHookType], async ([hookId, hookTypeParam]) => {
  if (hookId && typeof hookId === 'string') {
    const normalizedHookId = String(hookId);
    const currentId = editingHookId.value ? String(editingHookId.value) : null;
    
    if (normalizedHookId && currentId !== normalizedHookId) {
      isEditHookDrawerUpdatingFromRoute.value = true;
      editingHookId.value = normalizedHookId;
      editHookErrors.value = {};
      
      if (hookTypeParam === 'pre') {
        await fetchEditPreHook();
        if (editPreHookData.value?.data?.[0]) {
          editHookType.value = 'pre';
          editHookForm.value = { ...editPreHookData.value.data[0] };
          showEditHookDrawer.value = true;
        } else {
          editingHookId.value = null;
          editHookType.value = null;
          return;
        }
      } else if (hookTypeParam === 'post') {
        await fetchEditPostHook();
        if (editPostHookData.value?.data?.[0]) {
          editHookType.value = 'post';
          editHookForm.value = { ...editPostHookData.value.data[0] };
          showEditHookDrawer.value = true;
        } else {
          editingHookId.value = null;
          editHookType.value = null;
          return;
        }
      } else {
        await Promise.all([fetchEditPreHook(), fetchEditPostHook()]);
        
        if (editPreHookData.value?.data?.[0]) {
          editHookType.value = 'pre';
          editHookForm.value = { ...editPreHookData.value.data[0] };
          showEditHookDrawer.value = true;
        } else if (editPostHookData.value?.data?.[0]) {
          editHookType.value = 'post';
          editHookForm.value = { ...editPostHookData.value.data[0] };
          showEditHookDrawer.value = true;
        } else {
          editingHookId.value = null;
          editHookType.value = null;
          return;
        }
      }
      
      nextTick(() => {
        isEditHookDrawerUpdatingFromRoute.value = false;
      });
    }
  } else if (!hookId && showEditHookDrawer.value) {
    isEditHookDrawerUpdatingFromRoute.value = true;
    showEditHookDrawer.value = false;
    editingHookId.value = null;
    editHookForm.value = {};
    editHookErrors.value = {};
    editHookType.value = null;
    nextTick(() => {
      isEditHookDrawerUpdatingFromRoute.value = false;
    });
  }
}, { immediate: true });

watch(showEditHookDrawer, (isOpen) => {
  if (isEditHookDrawerUpdatingFromRoute.value) return;
  
  if (isOpen && editingHookId.value && editHookType.value) {
    if (route.query.editHook !== editingHookId.value || route.query.editHookType !== editHookType.value) {
      router.push({
        query: { ...route.query, editHook: editingHookId.value, editHookType: editHookType.value }
      });
    }
  } else if (!isOpen) {
    const newQuery = { ...route.query };
    delete newQuery.editHook;
    delete newQuery.editHookType;
    router.replace({ query: newQuery });
  }
});

async function editHook(hook: any) {
  const hookId = String(getId(hook));
  const hookType = hook._hookType;
  
  if (!hookType) {
    console.error('Hook type not determined for hook:', hook);
    return;
  }
  
  isEditHookDrawerUpdatingFromRoute.value = true;
  editingHookId.value = hookId;
  editHookErrors.value = {};
  
  if (hookType === 'pre') {
    await fetchEditPreHook();
    if (editPreHookData.value?.data?.[0]) {
      editHookType.value = 'pre';
      editHookForm.value = { ...editPreHookData.value.data[0] };
      showEditHookDrawer.value = true;
      router.push({
        query: { ...route.query, editHook: hookId, editHookType: 'pre' }
      });
    }
  } else if (hookType === 'post') {
    await fetchEditPostHook();
    if (editPostHookData.value?.data?.[0]) {
      editHookType.value = 'post';
      editHookForm.value = { ...editPostHookData.value.data[0] };
      showEditHookDrawer.value = true;
      router.push({
        query: { ...route.query, editHook: hookId, editHookType: 'post' }
      });
    }
  }
  
  nextTick(() => {
    isEditHookDrawerUpdatingFromRoute.value = false;
  });
}

function handleCancelEditHook() {
  showEditHookDrawer.value = false;
}

async function updateHook() {
  if (!editingHookId.value || !editHookForm.value || !editHookType.value) return;

  const isPreHook = editHookType.value === 'pre';
  const validate = isPreHook ? validatePreHook : validatePostHook;
  const { isValid, errors } = validate(editHookForm.value);

  if (!isValid) {
    editHookErrors.value = errors;
    toast.add({
      title: "Validation error",
      description: "Please check the fields with errors.",
      color: "error",
    });
    return;
  }

  const hookData = { ...editHookForm.value };

  if (isPreHook) {
    await executeUpdatePreHook({
      id: editingHookId.value,
      body: hookData,
    });
  } else {
    await executeUpdatePostHook({
      id: editingHookId.value,
      body: hookData,
    });
  }

  if (updateHookError.value) {
    return;
  }

  toast.add({
    title: `${isPreHook ? 'Pre' : 'Post'}-Hook updated successfully`,
    color: "success",
  });

  showEditHookDrawer.value = false;
  await Promise.all([fetchPreHooks(), fetchPostHooks(), fetchGlobalPreHooks(), fetchGlobalPostHooks()]);
}

const { execute: togglePreHookApi, error: togglePreHookError } = useApi(
  () => `/pre_hook_definition`,
  {
    method: "patch",
    errorContext: "Toggle Pre-Hook",
  }
);

const { execute: togglePostHookApi, error: togglePostHookError } = useApi(
  () => `/post_hook_definition`,
  {
    method: "patch",
    errorContext: "Toggle Post-Hook",
  }
);

const { execute: deletePreHookApi, error: deletePreHookError } = useApi(
  () => `/pre_hook_definition`,
  {
    method: "delete",
    errorContext: "Delete Pre-Hook",
  }
);

const { execute: deletePostHookApi, error: deletePostHookError } = useApi(
  () => `/post_hook_definition`,
  {
    method: "delete",
    errorContext: "Delete Post-Hook",
  }
);

async function toggleHook(hook: any, enabled: boolean) {
  const originalEnabled = hook.isEnabled;
  hook.isEnabled = enabled;
  const isPreHook = hook._hookType === 'pre';
  const toggleApi = isPreHook ? togglePreHookApi : togglePostHookApi;
  const toggleError = isPreHook ? togglePreHookError : togglePostHookError;

  await toggleApi({ id: getId(hook), body: { isEnabled: enabled } });

  if (toggleError.value) {
    hook.isEnabled = originalEnabled;
    return;
  }

  toast.add({
    title: "Success",
    description: `${isPreHook ? 'Pre' : 'Post'}-Hook ${enabled ? "enabled" : "disabled"} successfully`,
    color: "success",
  });

  await Promise.all([fetchPreHooks(), fetchPostHooks(), fetchGlobalPreHooks(), fetchGlobalPostHooks()]);
}

async function deleteHook(hook: any) {
  const isConfirmed = await confirm({
    title: "Delete Hook",
    content: `Are you sure you want to delete ${hook._hookType === 'pre' ? 'pre' : 'post'}-hook "${hook.name || "Unnamed"}"? This action cannot be undone.`,
    confirmText: "Delete",
    cancelText: "Cancel",
  });

  if (!isConfirmed) return;

  const isPreHook = hook._hookType === 'pre';
  const deleteApi = isPreHook ? deletePreHookApi : deletePostHookApi;
  const deleteError = isPreHook ? deletePreHookError : deletePostHookError;

  await deleteApi({ id: getId(hook) });

  if (deleteError.value) {
    return;
  }

  toast.add({
    title: "Success",
    description: `${isPreHook ? 'Pre' : 'Post'}-Hook deleted successfully`,
    color: "success",
  });

  await Promise.all([fetchPreHooks(), fetchPostHooks(), fetchGlobalPreHooks(), fetchGlobalPostHooks()]);
}

watch(
  () => routeData.value?.data?.[0],
  async (newRoute) => {
    if (newRoute) {
      await Promise.all([fetchHandlers(), fetchPreHooks(), fetchPostHooks(), fetchGlobalPreHooks(), fetchGlobalPostHooks()]);
    }
  },
  { immediate: true }
);

onMounted(async () => {
  await initializeForm();
  await Promise.all([fetchHandlers(), fetchPreHooks(), fetchPostHooks(), fetchGlobalPreHooks(), fetchGlobalPostHooks()]);
});
</script>
