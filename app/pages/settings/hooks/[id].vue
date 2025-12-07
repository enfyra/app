<template>
  <div class="space-y-6">
    <div class="max-w-[1000px] lg:max-w-[1000px] md:w-full">
      <CommonFormCard>
        <UForm :state="form" @submit="updateHook">
          <FormEditorLazy
            ref="formEditorRef"
            table-name="hook_definition"
            mode="update"
            v-model="form"
            v-model:errors="errors"
            @has-changed="(hasChanged) => hasFormChanges = hasChanged"
            :loading="loading"
            :excluded="['isSystem']"
          />
        </UForm>
      </CommonFormCard>
    </div>
  </div>

  <CommonEmptyState
    v-if="!loading && !hookData?.data?.[0]"
    title="Hook not found"
    description="The requested hook could not be loaded"
    icon="lucide:zap"
    size="sm"
  />
</template>

<script setup lang="ts">
const route = useRoute();

const toast = useToast();
const tableName = "hook_definition";
const { confirm } = useConfirm();

const id = route.params.id as string;

const hasFormChanges = ref(false);
const formEditorRef = ref();

const { validate, getIncludeFields, useFormChanges } = useSchema(tableName);
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
    formEditorRef.value?.confirmChanges();
    
    toast.add({
      title: "Reset Complete",
      color: "success",
      description: "All changes have been discarded.",
    });
  }
}

useHeaderActionRegistry([
  {
    id: "reset-hook",
    label: "Reset",
    icon: "lucide:rotate-ccw",
    variant: "outline",
    color: "warning",
    disabled: computed(() => !hasFormChanges.value),
    onClick: handleReset,
    show: computed(() => hasFormChanges.value),
  },
  {
    id: "delete-hook",
    label: "Delete",
    icon: "lucide:trash",
    variant: "solid",
    color: "error",
    size: "md",
    onClick: deleteHook,
    loading: computed(() => deleteLoading.value),
    permission: {
      and: [
        {
          route: "/hook_definition",
          actions: ["delete"],
        },
      ],
    },
  },
  {
    id: "save-hook",
    label: "Save",
    icon: "lucide:save",
    variant: "solid",
    color: "primary",
    size: "md",
    submit: updateHook,
    loading: computed(() => updateLoading.value),
    disabled: computed(() => !hasFormChanges.value),
    permission: {
      and: [
        {
          route: "/hook_definition",
          actions: ["update"],
        },
      ],
    },
  },
]);

const {
  data: hookData,
  pending: loading,
  execute: executeGetHook,
} = useApi(() => `/${tableName}`, {
  query: { fields: getIncludeFields(), filter: { id: { _eq: id } } },
  errorContext: "Fetch Hook",
});

const {
  error: updateError,
  execute: executeUpdateHook,
  pending: updateLoading,
} = useApi(() => `/${tableName}`, {
  method: "patch",
  errorContext: "Update Hook",
});

const {
  error: deleteError,
  execute: executeDeleteHook,
  pending: deleteLoading,
} = useApi(() => `/${tableName}`, {
  method: "delete",
  errorContext: "Delete Hook",
});

const form = ref<Record<string, any>>({});

const errors = ref<Record<string, string>>({});

async function initializeForm() {
  await executeGetHook();
  const data = hookData.value?.data?.[0];
  form.value = data ? { ...data } : {};
  if (data) {
    formChanges.update(data);
  }
}

async function updateHook() {
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

  await executeUpdateHook({ id, body: form.value });

  if (updateError.value) {
    return;
  }

  toast.add({
    title: "Success",
    color: "success",
    description: "Hook updated!",
  });
  errors.value = {};

  // Confirm form changes as new baseline
  formEditorRef.value?.confirmChanges();
  formChanges.update(form.value);
}

async function deleteHook() {
  const ok = await confirm({
    title: "Are you sure?",
    content: "This action cannot be undone.",
  });
  if (!ok) return;

  await executeDeleteHook({ id });

  if (deleteError.value) {
    return;
  }

  toast.add({ 
    title: "Success",
    description: "Hook deleted successfully", 
    color: "success" 
  });
  await navigateTo("/settings/hooks");
}

const { registerPageHeader } = usePageHeaderRegistry();

watch(hookData, (data) => {
  if (data?.data?.[0]) {
    registerPageHeader({
      title: `Hook: ${data.data[0].name || '(no name)'}`,
      gradient: "purple",
    });
  }
}, { immediate: true });

onMounted(() => {
  initializeForm();
});
</script>
