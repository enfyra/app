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
            :loading="loading"
          />
        </UForm>
      </CommonFormCard>
    </div>
  </div>

  <CommonEmptyState
    v-if="!loading && !configData?.data?.[0]"
    title="AI configuration not found"
    description="The requested AI configuration could not be loaded"
    icon="lucide:brain"
    size="sm"
  />
</template>

<script setup lang="ts">
definePageMeta({
  layout: "default",
  title: "AI Configuration Detail",
});

const route = useRoute();
const toast = useToast();
const { confirm } = useConfirm();
const { me } = useEnfyraAuth();
const { getIdFieldName } = useDatabase();
const { fetchAiConfig } = useGlobalState();

const tableName = "ai_config_definition";

const { validate, getIncludeFields } = useSchema(tableName);
const { registerPageHeader } = usePageHeaderRegistry();

const hasFormChanges = ref(false);
const formEditorRef = ref();
const { useFormChanges } = useSchema();
const formChanges = useFormChanges();
const form = ref<Record<string, any>>({});
const errors = ref<Record<string, string>>({});

const excludedFields = ['createdAt', 'updatedAt', 'createdBy', 'updatedBy'];

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
          route: "/ai_config_definition",
          actions: ["delete"],
        },
      ],
    },
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
          route: "/ai_config_definition",
          actions: ["update"],
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
  errorContext: "Fetch AI Configuration",
});

const {
  error: updateError,
  execute: executeUpdateConfig,
  pending: updateLoading,
} = useApi(() => `/${tableName}`, {
  method: "patch",
  errorContext: "Update AI Configuration",
});

const {
  error: deleteError,
  execute: executeDeleteConfig,
  pending: deleteLoading,
} = useApi(() => `/${tableName}`, {
  method: "delete",
  errorContext: "Delete AI Configuration",
});

watch(() => configData.value?.data?.[0]?.provider, (provider) => {
  if (provider) {
    registerPageHeader({
      title: `AI Config: ${provider}`,
      gradient: "cyan",
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

  toast.add({
    title: "Success",
    color: "success",
    description: "AI configuration updated!",
  });

  // Reload AI configs in global state
  await fetchAiConfig();

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

  toast.add({
    title: "Success",
    description: "AI configuration deleted successfully",
    color: "success"
  });

  // Reload AI configs in global state
  await fetchAiConfig();

  await navigateTo("/ai-agent/config");
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

