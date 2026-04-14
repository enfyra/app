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
const notify = useNotify();
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
    
    notify.success("Reset Complete", "All changes have been discarded.");
  }
}

useHeaderActionRegistry([
  {
    id: "reset-role",
    label: "Reset",
    icon: "lucide:rotate-ccw",
    variant: "outline",
    color: "warning",
    order: 1,
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
    order: 2,
    onClick: deleteRole,
    loading: computed(() => deleteLoading.value),
    disabled: computed(() => apiData.value?.data?.[0]?.isSystem ?? false),
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
    order: 999,
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

const { validateForm } = useFormValidation(tableName);

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

  if (!await validateForm(form.value, errors)) return;

  await updateRole({ body: form.value });

  if (updateError.value) {
    return;
  }

  notify.success("Success", "Role updated!");
  errors.value = {};
  hasFormChanges.value = false;

  await fetchRole();
  const freshData = apiData.value?.data?.[0];
  if (freshData) {
    form.value = { ...freshData };
    formChanges.update(freshData);
  }

  formEditorRef.value?.confirmChanges();
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

  notify.success("Success", "Role deleted successfully");
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
