<template>
  <div class="space-y-6">
    <!-- Header -->
    <CommonPageHeader
      title="Create New Route"
      title-size="lg"
      show-background
      background-gradient="from-lime-500/6 via-green-400/4 to-transparent"
      padding-y="py-6"
    />

    <div class="max-w-[1000px] lg:max-w-[1000px] md:w-full">
      <div class="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6">
        <UForm :state="createForm" @submit="handleCreate">
          <FormEditorLazy
            v-model="createForm"
            :table-name="tableName"
            v-model:errors="createErrors"
          />
        </UForm>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// useEnfyraApi is auto-imported in Nuxt
const toast = useToast();

const tableName = "route_definition";

const createForm = ref<Record<string, any>>({});
const createErrors = ref<Record<string, string>>({});

const { generateEmptyForm, validate } = useSchema(tableName);

useHeaderActionRegistry([
  {
    id: "save-routing",
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
          route: "/route_definition",
          actions: ["create"],
        },
      ],
    },
  },
]);

// Setup useEnfyraApi composable at top level
const {
  data: createData,
  error: createError,
  execute: executeCreateRoute,
  pending: createLoading,
} = useEnfyraApi(() => `/${tableName}`, {
  method: "post",
  errorContext: "Create Route",
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

  await executeCreateRoute({ body: createForm.value });

  if (createError.value) {
    return;
  }

  toast.add({
    title: "Route created successfully",
    color: "success",
  });

  await navigateTo(`/settings/routings/${createData.value.data[0].id}`, {
    replace: true,
  });
}
</script>
