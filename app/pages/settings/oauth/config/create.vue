<template>
  <div class="space-y-6">
    <div class="max-w-[1000px] lg:max-w-[1000px] md:w-full">
      <CommonFormCard>
        <UForm :state="createForm" @submit="handleCreate">
          <FormEditorLazy
            v-model="createForm"
            :table-name="tableName"
            :errors="createErrors"
            :excluded="[]"
            :field-map="{
              scope: { type: 'text', placeholder: 'openid,email,profile' },
              redirectUri: { type: 'text', placeholder: 'https://your-app.com/api/auth/callback' },
            }"
            @update:errors="(errors) => (createErrors = errors)"
            mode="create"
          />
        </UForm>
      </CommonFormCard>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: "default",
  title: "Create OAuth Configuration",
});

const toast = useToast();

const tableName = "oauth_config_definition";

const createForm = ref<Record<string, any>>({});
const createErrors = ref<Record<string, string>>({});

const { generateEmptyForm, validate } = useSchema(tableName);
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

  await executeCreateConfig({ body: createForm.value });

  if (createError.value) {
    return;
  }

  toast.add({
    title: "OAuth provider configured successfully",
    color: "success",
  });

  const { getId } = useDatabase();
  await navigateTo(`/settings/oauth/config/${getId(createData.value.data[0])}`, {
    replace: true,
  });
}
</script>
