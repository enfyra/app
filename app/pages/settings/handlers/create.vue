<template>
  <div class="space-y-6">
    <!-- Header -->
    <CommonPageHeader
      title="Create New Handler"
      title-size="lg"
      show-background
      background-gradient="from-emerald-500/6 via-teal-400/4 to-transparent"
      padding-y="py-6"
    />

    <div class="max-w-[1000px] lg:max-w-[1000px] md:w-full">
      <div class="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6">
        <UForm :state="createForm" @submit="handleCreate">
          <FormEditorLazy
            v-model="createForm"
            :table-name="tableName"
            v-model:errors="createErrors"
            :excluded="['createdBy', 'updatedBy']"
          />
        </UForm>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const toast = useToast();

const tableName = "route_handler_definition";

const createForm = ref<Record<string, any>>({});
const createErrors = ref<Record<string, string>>({});

const { generateEmptyForm, validate } = useSchema(tableName);

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

// Setup useApi composable at top level
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
