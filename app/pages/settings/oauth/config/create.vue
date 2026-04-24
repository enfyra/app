<template>
  <div class="space-y-6">
    <div class="max-w-[1000px] lg:max-w-[1000px] md:w-full">
      <CommonFormCard>
        <UForm :state="createForm" @submit="handleCreate">
          <FormEditorLazy
            v-model="createForm"
            :table-name="tableName"
            :errors="createErrors"
            :excluded="excludedFields"
            :field-map="fieldMap"
            @update:errors="(errors) => (createErrors = errors)"
            mode="create"
          />
        </UForm>
      </CommonFormCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { validateOAuthConfigForm } from "~/utils/oauth-config";

definePageMeta({
  layout: "default",
  title: "Create OAuth Configuration",
});

const notify = useNotify();

const tableName = "oauth_config_definition";

const createForm = ref<Record<string, any>>({});
const createErrors = ref<Record<string, string>>({});
const excludedFields = computed(() =>
  createForm.value?.autoSetCookies === true ? ["appCallbackUrl"] : []
);
const fieldMap = computed(() => ({
  scope: { type: "text", placeholder: "openid,email,profile" },
  redirectUri: {
    type: "text",
    placeholder: "https://api.example.com/auth/google/callback",
  },
  appCallbackUrl: {
    type: "text",
    placeholder: "https://client.example.com/oauth/callback",
    excluded: createForm.value?.autoSetCookies === true,
  },
}));

const { generateEmptyForm } = useSchema(tableName);
const { validateForm } = useFormValidation(tableName);
const { registerPageHeader } = usePageHeaderRegistry();

registerPageHeader({
  title: "Add OAuth Provider",
  gradient: "blue",
});

useHeaderActionRegistry([
  {
    id: "save-oauth-config",
    label: "Save",
    icon: "lucide:save",
    variant: "solid",
    color: "primary",
    order: 999,
    submit: handleCreate,
    loading: computed(() => createLoading.value),
    permission: {
      and: [
        {
          route: "/oauth_config_definition",
          actions: ["create"],
        },
      ],
    },
  },
]);

const {
  data: createData,
  error: createError,
  execute: executeCreateConfig,
  pending: createLoading,
} = useApi(() => `/${tableName}`, {
  method: "post",
  errorContext: "Create OAuth Config",
});

onMounted(() => {
  createForm.value = generateEmptyForm();
});

async function handleCreate() {
  if (!await validateForm(createForm.value, createErrors)) return;
  if (!validateOAuthConfigForm(createForm.value, createErrors.value)) return;

  await executeCreateConfig({ body: createForm.value });

  if (createError.value) {
    return;
  }

  notify.success("OAuth provider configured successfully");

  const { getId } = useDatabase();
  await navigateTo(`/settings/oauth/config/${getId(createData.value.data[0])}`, {
    replace: true,
  });
}
</script>
