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
            :field-map="fieldMap"
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
import {
  buildOAuthRedirectUri,
  validateOAuthConfigForm,
  validateOAuthUserProvisioningScript,
} from "~/utils/oauth-config";

definePageMeta({
  layout: "default",
  title: "OAuth Configuration Detail",
});

const route = useRoute();
const notify = useNotify();
const { confirm } = useConfirm();

const tableName = "oauth_config_definition";

const { getIncludeFields } = useSchema(tableName);
const { validateForm } = useFormValidation(tableName);
const { registerPageHeader } = usePageHeaderRegistry();

const hasFormChanges = ref(false);
const formEditorRef = ref();
const { useFormChanges } = useSchema();
const formChanges = useFormChanges();
const appOrigin = ref("");
const excludedFields = computed(() => {
  const fields = ["createdAt", "updatedAt", "isSystem"];
  if (form.value?.autoSetCookies === true) {
    fields.push("appCallbackUrl");
  }
  return fields;
});
const fieldMap = computed(() => ({
  scope: { type: "varchar", placeholder: "openid,email,profile" },
  redirectUri: {
    type: "varchar",
    disabled: true,
    placeholder: `${appOrigin.value || "https://app.example.com"}/api/auth/{provider}/callback`,
  },
  appCallbackUrl: {
    type: "varchar",
    placeholder: "https://client.example.com/oauth/callback",
    excluded: form.value?.autoSetCookies === true,
  },
  sourceCode: {
    label: "User Provisioning Script",
    description: "Must return an object merged into newly created OAuth users. Existing identity fields take precedence. Use @REPOS or #table_name when lookup is needed.",
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
    syncRedirectUri();
    hasFormChanges.value = formChanges.checkChanges(form.value);

    notify.success("Reset Complete", "All changes have been discarded.");
  }
}

useHeaderActionRegistry([
  {
    id: "reset-oauth-config",
    label: "Reset",
    icon: "lucide:rotate-ccw",
    variant: "outline",
    color: "warning",
    order: 1,
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
    order: 2,
    onClick: deleteConfig,
    loading: computed(() => deleteLoading.value),
    disabled: computed(() => configData.value?.data?.[0]?.isSystem ?? false),
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
    order: 999,
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

const { getIdFieldName } = useDatabase();

const {
  data: configData,
  pending: loading,
  execute: executeGetConfig,
} = useApi(() => `/${tableName}`, {
  query: {
    fields: getIncludeFields(),
    filter: { [getIdFieldName()]: { _eq: route.params.id } },
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

  syncRedirectUri();
  if (!await validateForm(form.value, errors)) return;
  if (!validateOAuthConfigForm(form.value, errors.value)) return;
  if (!await validateOAuthUserProvisioningScript(form.value, errors.value)) return;

  await executeUpdateConfig({
    id: route.params.id as string,
    body: form.value,
  });

  if (updateError.value) {
    return;
  }

  notify.success("Success", "OAuth configuration updated!");
  errors.value = {};
  hasFormChanges.value = false;

  await executeGetConfig();
  const freshData = configData.value?.data?.[0];
  if (freshData) {
    form.value = { ...freshData };
    form.value.scriptLanguage ||= "typescript";
    syncRedirectUri();
    formChanges.update(form.value);
  }

  formEditorRef.value?.confirmChanges();
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

  notify.success("Success", "OAuth configuration deleted successfully");
  await navigateTo("/settings/oauth/config");
}

async function initializeForm() {
  await executeGetConfig();
  const data = configData.value?.data?.[0];
  if (data) {
    form.value = { ...data };
    form.value.scriptLanguage ||= "typescript";
    syncRedirectUri();
    formChanges.update(form.value);
    hasFormChanges.value = formChanges.checkChanges(form.value);
  }
}

onMounted(() => {
  appOrigin.value = window.location.origin;
  initializeForm();
});

watch(
  () => [form.value?.provider, appOrigin.value],
  () => {
    const previousRedirectUri = form.value?.redirectUri;
    syncRedirectUri();
    if (form.value?.redirectUri !== previousRedirectUri) {
      hasFormChanges.value = formChanges.checkChanges(form.value);
    }
  }
);

function syncRedirectUri() {
  const redirectUri = buildOAuthRedirectUri(
    form.value?.provider,
    appOrigin.value
  );
  if (redirectUri) {
    form.value.redirectUri = redirectUri;
  }
}
</script>
