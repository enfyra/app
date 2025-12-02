<template>
  <div class="space-y-6">
    <div class="max-w-[1000px] lg:max-w-[1000px] md:w-full">
      <CommonFormCard>
        <UForm :state="form" @submit="updateConfig">
          <FormEditorLazy
            ref="formEditorRef"
            v-model="form"
            v-model:errors="errors"
            @has-changed="(hasChanged) => hasFormChanges = hasChanged"
            :table-name="tableName"
            :excluded="excludedFields"
            :includes="includedFields.length > 0 ? includedFields : undefined"
            :type-map="typeMap"
            :loading="loading"
          />
        </UForm>
      </CommonFormCard>
    </div>
  </div>

  <CommonEmptyState
    v-if="!loading && !configData?.data?.[0]"
    title="Storage configuration not found"
    description="The requested storage configuration could not be loaded"
    icon="lucide:hard-drive"
    size="sm"
  />
</template>

<script setup lang="ts">
definePageMeta({
  layout: "default",
  title: "Storage Configuration Detail",
});

const route = useRoute();
const toast = useToast();
const { confirm } = useConfirm();
const { me } = useEnfyraAuth();
const { getIdFieldName } = useDatabase();
const { fetchStorageConfigs: fetchGlobalStorageConfigs } = useGlobalState();

const tableName = "storage_config_definition";

const { validate, getIncludeFields } = useSchema(tableName);
const { registerPageHeader } = usePageHeaderRegistry();

const hasFormChanges = ref(false);
const formEditorRef = ref();
const { useFormChanges } = useSchema();
const formChanges = useFormChanges();
const form = ref<Record<string, any>>({});
const errors = ref<Record<string, string>>({});

const excludedFields = computed(() => {
  const baseExcluded = ['createdAt', 'updatedAt', 'createdBy', 'updatedBy', 'isEnabled'];
  const selectedType = form.value.type;
  
  if (!selectedType) {
    return baseExcluded;
  }
  
  const typeFieldMap: Record<string, string[]> = {
    'Google Cloud Storage': ['accessKeyId', 'secretAccessKey', 'accountId', 'region'],
    'Cloudflare R2': ['credentials', 'region'],
    'Amazon S3': ['credentials', 'accountId'],
    'Local Storage': ['accessKeyId', 'secretAccessKey', 'accountId', 'region', 'credentials', 'bucket'],
  };
  
  const fieldsToExclude = typeFieldMap[selectedType] || [];
  return [...baseExcluded, ...fieldsToExclude];
});

const includedFields = computed(() => {
  const selectedType = form.value.type;
  if (!selectedType) {
    return ['name', 'bucket', 'description', 'type'];
  }
  return [];
});

const typeMap = computed(() => ({
  type: {
    disabled: true,
  },
}));

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

useHeaderActionRegistry([
  {
    id: "reset-config",
    label: "Reset",
    icon: "lucide:rotate-ccw",
    variant: "outline",
    color: "warning",
    disabled: computed(() => !hasFormChanges.value),
    onClick: handleReset,
    show: computed(() => hasFormChanges.value),
  },
  {
    id: "save-config",
    label: "Save",
    icon: "lucide:save",
    variant: "solid",
    color: "primary",
    size: "md",
    submit: updateConfig,
    loading: computed(() => updateLoading.value),
    disabled: computed(() => !hasFormChanges.value),
    permission: {
      and: [
        {
          route: "/storage_config_definition",
          actions: ["update"],
        },
      ],
    },
  },
  {
    id: "delete-config",
    label: "Delete",
    icon: "lucide:trash",
    variant: "solid",
    color: "error",
    size: "md",
    onClick: deleteConfig,
    loading: computed(() => deleteLoading.value),
    permission: {
      and: [
        {
          route: "/storage_config_definition",
          actions: ["delete"],
        },
      ],
    },
  },
]);

const {
  data: configData,
  pending: loading,
  execute: executeGetConfig,
} = useApi(() => `/${tableName}`, {
  query: {
    fields: getIncludeFields(),
    filter: { id: { _eq: route.params.id } },
  },
  errorContext: "Fetch Storage Configuration",
});

const {
  error: updateError,
  execute: executeUpdateConfig,
  pending: updateLoading,
} = useApi(() => `/${tableName}`, {
  method: "patch",
  errorContext: "Update Storage Configuration",
});

const {
  error: deleteError,
  execute: executeDeleteConfig,
  pending: deleteLoading,
} = useApi(() => `/${tableName}`, {
  method: "delete",
  errorContext: "Delete Storage Configuration",
});

watch(() => configData.value?.data?.[0]?.name, (name) => {
  if (name) {
    registerPageHeader({
      title: `Storage: ${name}`,
      gradient: "blue",
    });
  }
}, { immediate: true });

async function updateConfig() {
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

  // Add updatedBy field with current user id (support both MongoDB and PostgreSQL)
  const idField = getIdFieldName();
  const body = {
    ...form.value,
    updatedBy: { [idField]: me.value?.[idField] }
  };

  await executeUpdateConfig({
    id: route.params.id as string,
    body,
  });

  if (updateError.value) {
    return;
  }

  // Refetch latest config data to ensure UI reflects server state
  await executeGetConfig();
  const data = configData.value?.data?.[0];
  if (data) {
    form.value = { ...data };
    formChanges.update(data);
    hasFormChanges.value = false;
    formEditorRef.value?.confirmChanges();
  }

  // Reload global storage configs
  await fetchGlobalStorageConfigs();

  toast.add({
    title: "Success",
    color: "success",
    description: "Storage configuration updated!",
  });
  errors.value = {};
}

async function deleteConfig() {
  const ok = await confirm({
    title: "Are you sure?",
    content: "This action cannot be undone.",
  });
  if (!ok) return;

  await executeDeleteConfig({ id: route.params.id as string });

  if (deleteError.value) {
    return;
  }

  // Reload global storage configs
  await fetchGlobalStorageConfigs();

  toast.add({
    title: "Success",
    description: "Storage configuration deleted successfully",
    color: "success"
  });
  await navigateTo("/storage/config");
}

async function initializeForm() {
  await executeGetConfig();
  const data = configData.value?.data?.[0];
  if (data) {
    form.value = { ...data };
    formChanges.update(data);
  }
}

onMounted(() => {
  initializeForm();
});
</script>
