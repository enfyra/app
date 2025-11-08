<template>
  <div class="space-y-6">
    <div class="max-w-[1000px] lg:max-w-[1000px] md:w-full">
      <CommonFormCard>
        <UForm :state="createForm" @submit="handleCreate">
          <FormEditorLazy
            v-model="createForm"
            :table-name="tableName"
            v-model:errors="createErrors"
            mode="create"
          />
        </UForm>
      </CommonFormCard>
    </div>
  </div>
</template>

<script setup lang="ts">
const toast = useToast();

const tableName = "hook_definition";

const createForm = ref<Record<string, any>>({});
const createErrors = ref<Record<string, string>>({});

const { generateEmptyForm, validate } = useSchema(tableName);

useHeaderActionRegistry({
  id: "save-hook",
  label: "Save",
  icon: "lucide:save",
  variant: "solid",
  color: "primary",
  submit: handleCreate,
  loading: computed(() => createLoading.value),
  permission: {
    and: [
      {
        route: "/hook_definition",
        actions: ["create"],
      },
    ],
  },
});

// Setup useApi composable at top level
const {
  data: createData,
  error: createError,
  execute: executeCreateHook,
  pending: createLoading,
} = useApi(() => `/${tableName}`, {
  method: "post",
  errorContext: "Create Hook",
});

const { registerPageHeader } = usePageHeaderRegistry();

registerPageHeader({
  title: "Create New Hook",
  gradient: "purple",
});

onMounted(() => {
  createForm.value = generateEmptyForm();
});

async function handleCreate() {
  const { isValid, errors } = validate(createForm.value);

  if (!isValid) {
    createErrors.value = errors;
    toast.add({
      title: "Validation error",
      description: "Please check the fields with errors.",
      color: "error",
    });
    return;
  }

  await executeCreateHook({ body: createForm.value });

  if (createError.value) {
    return;
  }

  toast.add({
    title: "Hook created successfully",
    color: "success",
  });

  const { getId } = useDatabase();
  await navigateTo(`/settings/hooks/${getId(createData.value.data[0])}`, {
    replace: true,
  });
}
</script>
