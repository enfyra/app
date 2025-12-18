<template>
  <div class="space-y-6">
    <div class="w-full max-w-[1000px] lg:max-w-[1000px]">
      <CommonFormCard>
        <UForm :state="createForm" @submit="handleCreate">
          <FormEditorLazy
            v-model="createForm"
            :table-name="tableName"
            v-model:errors="createErrors"
            :excluded="['createdBy', 'updatedBy']"
            mode="create"
          />
        </UForm>
      </CommonFormCard>
    </div>
  </div>
</template>

<script setup lang="ts">
const toast = useToast();

const tableName = "route_handler_definition";

const createForm = ref<Record<string, any>>({});
const createErrors = ref<Record<string, string>>({});

const { generateEmptyForm, validate } = useSchema(tableName);
const { registerPageHeader } = usePageHeaderRegistry();

registerPageHeader({
  title: "Create New Handler",
  gradient: "cyan",
});

useHeaderActionRegistry([
  {
    id: "save-handler",
    label: "Save",
    icon: "lucide:save",
    variant: "solid",
    color: "primary",
    size: "md",
    submit: handleCreate,
    loading: computed(() => createLoading.value),
    permission: {
      and: [
        {
          route: "/route_handler_definition",
          actions: ["create"],
        },
      ],
    },
  },
]);

const {
  data: createData,
  error: createError,
  execute: executeCreateHandler,
  pending: createLoading,
} = useApi(() => `/${tableName}`, {
  method: "post",
  errorContext: "Create Handler",
});

onMounted(() => {
  createForm.value = generateEmptyForm();
});

async function handleCreate() {
  const { isValid, errors } = validate(createForm.value);

  if (!isValid) {
    createErrors.value = errors;
    toast.add({
      title: "Missing information",
      description: "Please fill in all required fields.",
      color: "error",
    });
    return;
  }

  await executeCreateHandler({ body: createForm.value });

  if (createError.value) {
    return;
  }

  toast.add({
    title: "Handler created successfully",
    color: "success",
  });

  const { getId } = useDatabase();
  await navigateTo(`/settings/handlers/${getId(createData.value.data[0])}`, {
    replace: true,
  });
}
</script>
