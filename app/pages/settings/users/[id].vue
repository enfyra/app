<script setup lang="ts">
const route = useRoute();
const toast = useToast();
const { confirm } = useConfirm();
const { validate } = useSchema("user_definition");

const hasFormChanges = ref(false);
const formEditorRef = ref();
const { useFormChanges } = useSchema();
const formChanges = useFormChanges();
const { registerPageHeader } = usePageHeaderRegistry();

const {
  data: apiData,
  pending: loading,
  execute: fetchUser,
} = useApi(() => "/user_definition", {
  query: computed(() => ({
    fields: "*",
    filter: {
      id: {
        _eq: route.params.id,
      },
    },
  })),
  errorContext: "Fetch User",
});

watch(() => apiData.value?.data?.[0]?.email, (email) => {
  if (email) {
    registerPageHeader({
      title: email,
      gradient: "blue",
    });
  }
}, { immediate: true });

const form = ref<Record<string, any>>({});

const errors = ref<Record<string, string>>({});

async function initializeForm() {
  await fetchUser();
  const data = apiData.value?.data?.[0];
  if (data) {
    form.value = { ...data };
    formChanges.update(data);
  }
}

const {
  execute: updateUser,
  pending: updateLoading,
  error: updateError,
} = useApi(() => `/user_definition/${route.params.id}`, {
  method: "patch",
  errorContext: "Update User",
});

const {
  execute: removeUser,
  pending: deleteLoading,
  error: deleteError,
} = useApi(() => `/user_definition/${route.params.id}`, {
  method: "delete",
  errorContext: "Delete User",
});

async function handleReset() {
  const ok = await confirm({
    title: "Reset Changes",
    content: "Are you sure you want to discard all changes? All modifications will be lost.",
  });
  if (!ok) {
    return;
  }

  if (formChanges.originalData.value) {
    form.value = formChanges.discardChanges(form.value);
    hasFormChanges.value = false;
    
    toast.add({
      title: "Reset Complete",
      color: "success",
      description: "All changes have been discarded.",
    });
  }
}

useHeaderActionRegistry([
  {
    id: "reset-user",
    label: "Reset",
    icon: "lucide:rotate-ccw",
    variant: "outline",
    color: "warning",
    disabled: computed(
      () =>
        loading.value ||
        updateLoading.value ||
        deleteLoading.value ||
        !hasFormChanges.value
    ),
    onClick: handleReset,
    show: computed(() => hasFormChanges.value),
  },
  {
    id: "save-user",
    label: "Save",
    icon: "lucide:save",
    variant: "solid",
    color: "primary",
    size: "md",
    loading: computed(() => updateLoading.value),
    disabled: computed(() => !hasFormChanges.value),
    submit: saveUser,
    permission: {
      and: [
        {
          route: "/user_definition",
          actions: ["update"],
        },
      ],
    },
  },
  {
    id: "delete-user",
    label: "Delete",
    icon: "lucide:trash",
    variant: "solid",
    color: "error",
    size: "md",
    loading: computed(() => deleteLoading.value),
    onClick: deleteUser,
    permission: {
      and: [
        {
          route: "/user_definition",
          actions: ["delete"],
        },
      ],
    },
  },
]);

async function saveUser() {
  if (!form.value) return;

  const { isValid, errors: validationErrors } = validate(form.value);
  if (!isValid) {
    errors.value = validationErrors;
    toast.add({
      title: "Missing information",
      description: "Please fill in all required fields.",
      color: "error",
    });
    return;
  }

  await updateUser({ body: form.value });

  if (updateError.value) {
    return;
  }

  toast.add({
    title: "Success",
    color: "success",
    description: "User updated!",
  });
  errors.value = {};

  // Confirm form changes as new baseline
  formEditorRef.value?.confirmChanges();
  formChanges.update(form.value);
}

async function deleteUser() {
  const ok = await confirm({
    content: `Are you sure you want to delete user "${apiData.value?.data?.[0]?.name}"?`,
  });
  if (!ok) return;

  await removeUser();

  if (deleteError.value) {
    return;
  }

  toast.add({
    title: "User deleted",
    color: "success",
  });
  await navigateTo("/settings/users");
}

onMounted(() => {
  initializeForm();
});
</script>

<template>
  <div class="space-y-6">
    <div class="max-w-[1000px] lg:max-w-[1000px] md:w-full">
      <CommonFormCard>
        <UForm :state="form" @submit="saveUser">
          <FormEditorLazy
            ref="formEditorRef"
            v-model="form"
            v-model:errors="errors"
            @has-changed="(hasChanged) => hasFormChanges = hasChanged"
            table-name="user_definition"
            :excluded="['isRootAdmin', 'isSystem', 'allowedRoutePermissions']"
            :loading="loading"
          />
        </UForm>
      </CommonFormCard>
    </div>
  </div>

  <CommonEmptyState
    v-if="!loading && !apiData?.data?.[0]"
    title="User not found"
    description="The requested user could not be loaded"
    icon="lucide:user-x"
    size="sm"
  />
</template>
