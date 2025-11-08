<template>
  <div class="space-y-6">
    <div class="max-w-[1000px] lg:max-w-[1000px] md:w-full">
      <CommonFormCard>
        <UForm :state="form" @submit="handleCreate">
          <FormEditorLazy
            v-model="form"
            v-model:errors="errors"
            :table-name="tableName"
            :excluded="['allowedRoutePermissions']"
            mode="create"
          />
        </UForm>
      </CommonFormCard>
    </div>
  </div>
</template>

<script setup lang="ts">
const toast = useToast();

const tableName = "user_definition";

const form = ref<Record<string, any>>({});
const errors = ref<Record<string, string>>({});

const { generateEmptyForm, validate } = useSchema(tableName);
const { registerPageHeader } = usePageHeaderRegistry();

registerPageHeader({
  title: "Create New User",
  gradient: "blue",
});

const {
  data: createData,
  pending: createLoading,
  execute: createUser,
  error: createError,
} = useApi(() => `/${tableName}`, {
  method: "post",
  errorContext: "Create User",
});

useHeaderActionRegistry({
  id: "save-user",
  label: "Save",
  icon: "lucide:save",
  variant: "solid",
  color: "primary",
  loading: computed(() => createLoading.value),
  submit: handleCreate,
  permission: {
    and: [
      {
        route: "/user_definition",
        actions: ["create"],
      },
    ],
  },
});

onMounted(() => {
  form.value = generateEmptyForm();
});

async function handleCreate() {
  const { isValid, errors: validationErrors } = validate(form.value);
  errors.value = validationErrors;

  if (!isValid) {
    toast.add({
      title: "Invalid data",
      description: "Please check the fields with errors.",
      color: "error",
    });
    return;
  }

  await createUser({ body: form.value });

  if (createError.value) {
    return;
  }

  toast.add({
    title: "User created successfully",
    color: "success",
  });

  const { getId } = useDatabase();
  await navigateTo(`/settings/users/${getId(createData.value?.data[0])}`, {
    replace: true,
  });
}
</script>
