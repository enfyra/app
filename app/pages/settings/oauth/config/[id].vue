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
            :excluded="['createdAt', 'updatedAt', 'isSystem']"
            :field-map="{
              scope: { type: 'varchar', placeholder: 'openid,email,profile' },
              redirectUri: { type: 'varchar', placeholder: 'https://your-app.com/api/auth/callback' },
            }"
            :loading="loading"
          />
        </UForm>
      </CommonFormCard>
    </div>
  </div>

  <CommonEmptyState
    v-if="!loading && !configData?.data?.[0]"
    title="OAuth configuration not found"
    description="The requested OAuth configuration could not be loaded"
    icon="lucide:key"
    size="sm"
  />
</template>

<script setup lang="ts">
definePageMeta({
  layout: "default",
  title: "OAuth Configuration Detail",
});

const route = useRoute();
const toast = useToast();
const { confirm } = useConfirm();

const tableName = "oauth_config_definition";

const { validate, getIncludeFields } = useSchema(tableName);
const { registerPageHeader } = usePageHeaderRegistry();

const hasFormChanges = ref(false);
const formEditorRef = ref();
const { useFormChanges } = useSchema();
const formChanges = useFormChanges();

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
    id: "reset-oauth-config",
    label: "Reset",
    icon: "lucide:rotate-ccw",
    variant: "outline",
    color: "warning",
    disabled: computed(() => !hasFormChanges.value),
    onClick: handleReset,
    show: computed(() => hasFormChanges.value),
  },
  {
    id: "delete-oauth-config",
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
          route: "/oauth_config_definition",
          actions: ["delete"],
        },
      ],
    },
  },
  {
    id: "save-oauth-config",
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
          route: "/oauth_config_definition",
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
  errorContext: "Fetch OAuth Config",
});

watch(() => configData.value?.data?.[0]?.provider, (provider) => {
  if (provider) {
    registerPageHeader({
      title: `OAuth: ${getProviderLabel(provider)}`,
      gradient: "blue",
    });
  }
}, { immediate: true });

const {
  error: updateError,
  execute: executeUpdateConfig,
  pending: updateLoading,
} = useApi(() => `/${tableName}`, {
  method: "patch",
  errorContext: "Update OAuth Config",
});

const {
  error: deleteError,
  execute: executeDeleteConfig,
  pending: deleteLoading,
} = useApi(() => `/${tableName}`, {
  method: "delete",
  errorContext: "Delete OAuth Config",
});

const form = ref<Record<string, any>>({});
const errors = ref<Record<string, string>>({});

function getProviderLabel(provider: string) {
  switch (provider) {
    case "google":
      return "Google";
    case "facebook":
      return "Facebook";
    case "github":
      return "GitHub";
    default:
      return provider;
  }
}

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

  await executeUpdateConfig({
    id: route.params.id as string,
    body: form.value,
  });

  if (updateError.value) {
    return;
  }

  toast.add({
    title: "Success",
    color: "success",
    description: "OAuth configuration updated!",
  });
  errors.value = {};

  formEditorRef.value?.confirmChanges();
  formChanges.update(form.value);
}

async function deleteConfig() {
  const ok = await confirm({
    title: "Are you sure?",
    content: "This action cannot be undone. The OAuth provider configuration will be permanently deleted.",
  });
  if (!ok) return;

  await executeDeleteConfig({ id: route.params.id as string });

  if (deleteError.value) {
    return;
  }

  toast.add({
    title: "Success",
    description: "OAuth configuration deleted successfully",
    color: "success"
  });
  await navigateTo("/settings/oauth/config");
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
