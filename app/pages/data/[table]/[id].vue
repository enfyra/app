<script setup lang="ts">
const route = useRoute();

const toast = useToast();
const tableName = route.params.table as string;
const { validate } = useSchema(tableName);
const updateErrors = ref<Record<string, string>>({});

const { confirm } = useConfirm();

const hasFormChanges = ref(false);
const formEditorRef = ref();
const { useFormChanges } = useSchema();
const formChanges = useFormChanges();

// Get the correct route for this table
const { getRouteForTableName, ensureRoutesLoaded } = useRoutes();
const { registerPageHeader } = usePageHeaderRegistry();

// Initialize currentRecord ref early
const currentRecord = ref<Record<string, any>>({});

// Load routes on mount
onMounted(async () => {
  await ensureRoutesLoaded();
  await initializeForm();
});

watch(() => currentRecord.value.id, (id) => {
  if (id) {
    registerPageHeader({
      title: `${route.params.table}: ${id}`,
      gradient: "cyan",
    });
  }
}, { immediate: true });

const {
  data: apiData,
  pending: loading,
  execute: fetchRecord,
} = useApi(() => getRouteForTableName(tableName), {
  query: computed(() => ({
    fields: "*",
    filter: {
      id: {
        _eq: route.params.id,
      },
    },
  })),
  errorContext: "Fetch Record",
});

async function initializeForm() {
  await fetchRecord();
  const data = apiData.value?.data?.[0];
  if (data) {
    currentRecord.value = { ...data };
    formChanges.update(data);
  }
}

// Already handled in the onMounted above

async function handleUpdate() {
  const { isValid, errors } = validate(currentRecord.value);

  if (!isValid) {
    updateErrors.value = errors;
    toast.add({
      title: "Missing information",
      description: "Please fill in all required fields.",
      color: "error",
    });
    return;
  }

  await updateRecord({
    id: route.params.id as string,
    body: currentRecord.value,
  });

  if (updateError.value) {
    return;
  }

  toast.add({
    title: "Success",
    color: "success",
    description: "Record updated!",
  });
  updateErrors.value = {};

  // Confirm form changes as new baseline (like settings pages do)
  formEditorRef.value?.confirmChanges();
  formChanges.update(currentRecord.value);
}

const {
  pending: updateLoading,
  execute: updateRecord,
  error: updateError,
} = useApi(() => getRouteForTableName(tableName), {
  method: "patch",
  errorContext: "Update Record",
});

const {
  error: deleteError,
  execute: executeDeleteRecord,
  pending: deleteLoading,
} = useApi(() => getRouteForTableName(tableName), {
  method: "delete",
  errorContext: "Delete Record",
});

async function deleteRecord() {
  const ok = await confirm({
    title: "Are you sure?",
    content: "This action cannot be undone.",
  });
  if (!ok) return;

  await executeDeleteRecord({ id: route.params.id as string });

  if (deleteError.value) {
    return;
  }

  toast.add({
    title: "Record deleted",
    color: "success",
  });
  await navigateTo(`/data/${route.params.table}`);
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
    currentRecord.value = formChanges.discardChanges(currentRecord.value);
    hasFormChanges.value = false;
    
    toast.add({
      title: "Reset Complete",
      color: "success",
      description: "All changes have been discarded.",
    });
  }
}

useHeaderActionRegistry([
  {
    id: "reset-data-entry",
    label: "Reset",
    icon: "lucide:rotate-ccw",
    variant: "outline",
    color: "warning",
    disabled: computed(() => !hasFormChanges.value),
    onClick: handleReset,
    show: computed(() => hasFormChanges.value),
  },
  {
    id: "save-data-entry",
    label: "Save",
    icon: "lucide:save",
    variant: "solid",
    color: "primary",
    size: "md",
    loading: computed(() => updateLoading.value),
    disabled: computed(() => !hasFormChanges.value),
    submit: handleUpdate,
    permission: {
      and: [
        {
          route: getRouteForTableName(tableName),
          actions: ["update"],
        },
      ],
    },
  },
  {
    id: "delete-data-entry",
    label: "Delete",
    icon: "lucide:trash",
    variant: "solid",
    color: "error",
    size: "md",
    loading: computed(() => deleteLoading.value),
    onClick: deleteRecord,
    permission: {
      and: [
        {
          route: getRouteForTableName(tableName),
          actions: ["delete"],
        },
      ],
    },
  },
]);
</script>

<template>
  <div class="space-y-6">
    <!-- Content - Limited width -->
    <div class="max-w-[1000px] lg:max-w-[1000px] md:w-full">
      <CommonFormCard>
        <FormEditorLazy
          ref="formEditorRef"
          :table-name="(route.params.table as string)"
          mode="update"
          v-model="currentRecord"
          v-model:errors="updateErrors"
          @has-changed="(hasChanged) => hasFormChanges = hasChanged"
          :loading="loading"
        />
      </CommonFormCard>
    </div>
  </div>
</template>
