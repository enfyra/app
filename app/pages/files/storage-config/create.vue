<template>
  <div class="space-y-6">
    <div class="max-w-[1000px] lg:max-w-[1000px] md:w-full">
      <CommonFormCard>
        <UForm :state="createForm" @submit="handleCreate">
          <FormEditorLazy
            v-model="createForm"
            :table-name="tableName"
            :errors="createErrors"
            @update:errors="(errors) => (createErrors = errors)"
            :excluded="['createdBy', 'updatedBy']"
          />
        </UForm>
      </CommonFormCard>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: "default",
  title: "Create Storage Configuration",
});

const toast = useToast();
const { me } = useEnfyraAuth();
const { getIdFieldName } = useDatabase();
const { fetchStorageConfigs: fetchGlobalStorageConfigs } = useGlobalState();

const tableName = "storage_config_definition";

const createForm = ref<Record<string, any>>({});
const createErrors = ref<Record<string, string>>({});

const { generateEmptyForm, validate } = useSchema(tableName);
const { registerPageHeader } = usePageHeaderRegistry();

registerPageHeader({
  title: "Create Storage Configuration",
  gradient: "blue",
});

useHeaderActionRegistry({
  id: "save-storage-config",
  label: "Save",
  icon: "lucide:save",
  variant: "solid",
  color: "primary",
  submit: handleCreate,
  loading: computed(() => createLoading.value),
  permission: {
    and: [
      {
        route: "/storage_config_definition",
        actions: ["create"],
      },
    ],
  },
});

// Setup useApi composable at top level
const {
  data: createData,
  error: createError,
  execute: executeCreateConfig,
  pending: createLoading,
} = useApi(() => `/${tableName}`, {
  method: "post",
  errorContext: "Create Storage Configuration",
});

onMounted(() => {
  createForm.value = generateEmptyForm();
});

async function handleCreate() {
  const { isValid, errors } = validate(createForm.value);

  if (!isValid) {
    createErrors.value = errors;
    toast.add({
      title: "Error",
      description: "Please check the fields with errors.",
      color: "error",
    });
    return;
  }

  // Add createdBy field with current user id (support both MongoDB and PostgreSQL)
  const idField = getIdFieldName();
  const body = {
    ...createForm.value,
    createdBy: { [idField]: me.value?.[idField] }
  };

  await executeCreateConfig({ body });

  if (createError.value) {
    return;
  }

  // Reload global storage configs
  await fetchGlobalStorageConfigs();

  toast.add({
    title: "Storage configuration created successfully",
    color: "success",
  });

  const { getId } = useDatabase();
  await navigateTo(`/files/storage-config/${getId(createData.value.data[0])}`, {
    replace: true,
  });
}
</script>
