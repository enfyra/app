<template>
  <div class="space-y-6">
    <div class="max-w-[1000px] lg:max-w-[1000px] md:w-full">
      <CommonFormCard>
        <UForm :state="createForm" @submit="handleCreate">
          <FormEditorLazy
            v-model="createForm"
            :table-name="tableName"
            v-model:errors="createErrors"
            :excluded="['routePermissions']"
            mode="create"
          />
        </UForm>
      </CommonFormCard>
    </div>
  </div>
</template>

<script setup lang="ts">
const toast = useToast();

const tableName = "role_definition";

const createForm = ref<Record<string, any>>({});
const createErrors = ref<Record<string, string>>({});

const { generateEmptyForm, validate } = useSchema(tableName);
const { getId } = useDatabase();

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

const { registerPageHeader } = usePageHeaderRegistry();

registerPageHeader({
  title: "Create New Role",
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

  await navigateTo(`/settings/roles/${getId(createData.value?.data[0])}`, {
    replace: true,
  });
}
</script>
