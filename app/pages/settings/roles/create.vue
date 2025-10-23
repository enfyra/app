<template>
  <div class="space-y-6">
    <!-- Header -->
    <CommonPageHeader
      title="Create New Role"
      title-size="lg"
      show-background
      background-gradient="from-amber-500/6 via-yellow-400/4 to-transparent"
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
// useApi is auto-imported in Nuxt
const toast = useToast();

const tableName = "role_definition";

const createForm = ref<Record<string, any>>({});
const createErrors = ref<Record<string, string>>({});

const { generateEmptyForm, validate } = useSchema(tableName);

// Setup useApi composable at top level
const {
  data: createData,
  pending: createLoading,
  execute: createRole,
  error: createError,
} = useApi(() => `/${tableName}`, {
  method: "post",
  errorContext: "Create Role",
});

useHeaderActionRegistry({
  id: "save-role",
  label: "Save",
  icon: "lucide:save",
  variant: "solid",
  color: "primary",
  loading: computed(() => createLoading.value),
  submit: handleCreate,
  permission: {
    and: [
      {
        route: "/role_definition",
        actions: ["create"],
      },
    ],
  },
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

  await createRole({ body: createForm.value });

  if (createError.value) {
    return;
  }

  toast.add({
    title: "Role created successfully",
    color: "success",
  });

  const { getId } = useDatabase();
  await navigateTo(`/settings/roles/${getId(createData.value?.data[0])}`, {
    replace: true,
  });
}
</script>
