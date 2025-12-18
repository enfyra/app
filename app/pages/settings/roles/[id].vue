<template>
  <div class="space-y-6">
    <div class="space-y-6">
      <div class="max-w-[1000px] lg:max-w-[1000px] md:w-full">
        <CommonFormCard>
          <UForm :state="form" @submit="save">
            <FormEditorLazy
              ref="formEditorRef"
              v-model="form"
              v-model:errors="errors"
              @has-changed="(hasChanged) => hasFormChanges = hasChanged"
              :table-name="tableName"
              :excluded="['routePermissions']"
              :loading="loading"
            />
          </UForm>
        </CommonFormCard>
      </div>
    </div>

    <CommonEmptyState
      v-if="!loading && !apiData?.data?.[0]"
      title="Role not found"
      description="The requested role could not be loaded"
      icon="lucide:shield-x"
      size="sm"
    />
  </div>
</template>

<script setup lang="ts">
const route = useRoute();
const toast = useToast();
const { confirm } = useConfirm();

const id = route.params.id as string;
const tableName = "role_definition";
const { getIncludeFields } = useSchema(tableName);

const hasFormChanges = ref(false);
const formEditorRef = ref();
const { useFormChanges } = useSchema();
const formChanges = useFormChanges();

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
    id: "reset-role",
    label: "Reset",
    icon: "lucide:rotate-ccw",
    variant: "outline",
    color: "warning",
    disabled: computed(() => !hasFormChanges.value),
    onClick: handleReset,
    show: computed(() => hasFormChanges.value),
  },
  {
    id: "delete-role",
    label: "Delete",
    icon: "lucide:trash",
    variant: "soft",
    color: "error",
    onClick: deleteRole,
    loading: computed(() => deleteLoading.value),
    permission: {
      and: [
        {
          route: "/role_definition",
          actions: ["delete"],
        },
      ],
    },
  },
  {
    id: "save-role",
    label: "Save",
    icon: "lucide:save",
    variant: "solid",
    color: "primary",
    onClick: save,
    loading: computed(() => updateLoading.value),
    disabled: computed(() => !hasFormChanges.value),
    permission: {
      and: [
        {
          route: "/role_definition",
          actions: ["update"],
        },
      ],
    },
  },
]);

const errors = ref<Record<string, string>>({});

const { validate } = useSchema(tableName);

const {
  data: apiData,
  pending: loading,
  execute: fetchRole,
} = useApi(() => `/${tableName}`, {
  query: computed(() => ({
    fields: getIncludeFields(),
    filter: { id: { _eq: id } },
  })),
  errorContext: "Fetch Role",
});

const form = ref<Record<string, any>>({});

async function initializeForm() {
  await fetchRole();
  const data = apiData.value?.data?.[0];
  if (data) {
    form.value = { ...data };
    formChanges.update(data);
  }
}

const {
  execute: updateRole,
  pending: updateLoading,
  error: updateError,
} = useApi(() => `/${tableName}/${id}`, {
  method: "patch",
  errorContext: "Update Role",
});

const {
  execute: deleteRoleApi,
  pending: deleteLoading,
  error: deleteError,
} = useApi(() => `/${tableName}/${id}`, {
  method: "delete",
  errorContext: "Delete Role",
});

async function save() {
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

  await updateRole({ body: form.value });

  if (updateError.value) {
    return;
  }

  toast.add({
    title: "Success",
    color: "success",
    description: "Role updated!",
  });
  errors.value = {};

  formEditorRef.value?.confirmChanges();
  formChanges.update(form.value);
}

async function deleteRole() {
  const ok = await confirm({
    title: "Are you sure?",
    content: "You cannot go back",
  });
  if (!ok) return;

  await deleteRoleApi();

  if (deleteError.value) {
    return;
  }

  toast.add({ 
    title: "Success",
    description: "Role deleted successfully", 
    color: "success" 
  });
  await navigateTo("/settings/roles");
}

const { registerPageHeader } = usePageHeaderRegistry();

registerPageHeader({
  title: "Role Details",
  gradient: "purple",
});

onMounted(() => {
  initializeForm();
});
</script>
