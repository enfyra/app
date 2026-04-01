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

const { generateEmptyForm } = useSchema(tableName);
const { validateForm } = useFormValidation(tableName);
const { getId } = useDatabase();

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
  order: 999,
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
  if (!await validateForm(createForm.value, createErrors)) return;

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
