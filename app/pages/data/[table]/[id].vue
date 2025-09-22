<script setup lang="ts">
const route = useRoute();

const toast = useToast();
const tableName = route.params.table as string;
const { validate } = useSchema(tableName);
const updateErrors = ref<Record<string, string>>({});

const { confirm } = useConfirm();

const hasFormChanges = ref(false);
const formEditorRef = ref();

// Get the correct route for this table
const { getRouteForTableName, ensureRoutesLoaded } = useRoutes();


// Load routes on mount
onMounted(async () => {
  await ensureRoutesLoaded();
  await initializeForm();
});

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

const currentRecord = ref<Record<string, any>>({});

async function initializeForm() {
  await fetchRecord();
  const data = apiData.value?.data?.[0];
  if (data) {
    currentRecord.value = { ...data };
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

  formEditorRef.value?.confirmChanges();
}

const {
  data: updateData,
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

useHeaderActionRegistry([
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
const title = computed(() => {
  if (loading.value) return "Loading...";
  return `${route.params.table}: ${currentRecord.value.id}`;
});
</script>

<template>
  <div class="space-y-6">
    <!-- Header - Full width -->
    <CommonPageHeader
      :title
      show-background
      background-gradient="from-cyan-500/6 via-blue-400/4 to-transparent"
      padding-y="py-6"
      title-size="md"
    />

    <!-- Content - Limited width -->
    <div class="max-w-[1000px] lg:max-w-[1000px] md:w-full">
      <div class="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6">
        <FormEditorLazy
          ref="formEditorRef"
          :table-name="(route.params.table as string)"
          mode="edit"
          v-model="currentRecord"
          v-model:errors="updateErrors"
          v-model:has-changes="hasFormChanges"
          :loading="loading"
        />
      </div>
    </div>
  </div>
</template>
