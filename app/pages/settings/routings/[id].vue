<template>
  <div class="space-y-6">
    <div class="max-w-[1000px] lg:max-w-[1000px] md:w-full space-y-6">
      <CommonFormCard>
        <UForm :state="form" @submit="updateRoute">
          <FormEditorLazy
            ref="formEditorRef"
            v-model="form"
            v-model:errors="errors"
            @has-changed="(hasChanged) => hasFormChanges = hasChanged"
            :table-name="tableName"
            :excluded="['routePermissions', 'mainTable']"
            :type-map="typeMap"
            :loading="loading"
          />
        </UForm>
      </CommonFormCard>

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
const toast = useToast();
const { confirm } = useConfirm();
const { loadRoutes } = useRoutes();

const tableName = "route_definition";
const hasFormChanges = ref(false);
const formEditorRef = ref();
const { useFormChanges } = useSchema();
const formChanges = useFormChanges();

const { validate, getIncludeFields } = useSchema(tableName);
const { registerPageHeader } = usePageHeaderRegistry();

registerPageHeader({
  title: "Route Details",
  gradient: "cyan",
});

// Init typeMap with default value (will be updated after routeData loads)
const typeMap = ref<Record<string, any>>({});

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

// Update page header when route data loads
watch(() => routeData.value?.data?.[0]?.path, (path) => {
  if (path) {
    registerPageHeader({
      title: `Route: ${path}`,
      gradient: "cyan",
    });
  }
}, { immediate: true });

// Update typeMap when route data changes
watch(() => routeData.value?.data?.[0], (currentRoute) => {
  if (!currentRoute) return;

  // Check if route has associated table
  let hasAssociatedTable = false;
  if (currentRoute.mainTable) {
    const { schemas } = useSchema();
    const { getId } = useDatabase();
    const mainTableId = getId(currentRoute.mainTable);
    if (mainTableId) {
      hasAssociatedTable = Object.values(schemas.value).some(
        (table: any) => String(getId(table)) === String(mainTableId)
      );
    }
  }

  // Update typeMap to disable isEnabled if has associated table
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
  errorContext: "Delete Route",
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

  // Reregister menus after route update
  const { registerDataMenuItems } = useMenuRegistry();
  const { schemas } = useSchema();
  await registerDataMenuItems(Object.values(schemas.value));

  // Confirm form changes as new baseline
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

  // Reregister menus after route deletion
  const { registerDataMenuItems } = useMenuRegistry();
  const { schemas } = useSchema();
  await registerDataMenuItems(Object.values(schemas.value));
  
  await navigateTo("/settings/routings");
}

onMounted(() => {
  initializeForm();
});
</script>
