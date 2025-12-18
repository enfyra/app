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
            :excluded="excludedFields"
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
  title: "Create AI Configuration",
});

const toast = useToast();
const { me } = useEnfyraAuth();
const { getIdFieldName, getId } = useDatabase();
const { fetchAiConfig } = useGlobalState();

const tableName = "ai_config_definition";

const createForm = ref<Record<string, any>>({});
const createErrors = ref<Record<string, string>>({});

const { generateEmptyForm, validate } = useSchema(tableName);
const { registerPageHeader } = usePageHeaderRegistry();

const excludedFields = ['createdBy', 'updatedBy'];

registerPageHeader({
  title: "Create AI Configuration",
  gradient: "cyan",
});

useHeaderActionRegistry({
  id: "save-ai-config",
  label: "Save",
  icon: "lucide:save",
  variant: "solid",
  color: "primary",
  submit: handleCreate,
  loading: computed(() => createLoading.value),
  permission: {
    and: [
      {
        route: "/ai_config_definition",
        actions: ["create"],
      },
    ],
  },
});

const {
  data: createData,
  error: createError,
  execute: executeCreateConfig,
  pending: createLoading,
} = useApi(() => `/${tableName}`, {
  method: "post",
  errorContext: "Create AI Configuration",
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

  const idField = getIdFieldName();
  const body = {
    ...createForm.value,
    createdBy: { [idField]: me.value?.[idField] }
  };

  await executeCreateConfig({ body });

  if (createError.value) {
    return;
  }

  toast.add({
    title: "AI configuration created successfully",
    color: "success",
  });

  await fetchAiConfig();

  await navigateTo(`/ai-agent/config/${getId(createData.value.data[0])}`, {
    replace: true,
  });
}
</script>

