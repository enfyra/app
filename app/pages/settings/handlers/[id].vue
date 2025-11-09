<template>
  <div class="max-w-[1000px] lg:max-w-[1000px] md:w-full space-y-6">
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
              :loading="loading"
              :excluded="['createdBy', 'updatedBy']"
            />
          </UForm>
        </CommonFormCard>
      </div>
    </div>

    <CommonEmptyState
      v-if="!loading && !handlerData?.data?.[0]"
      title="Handler not found"
      description="The requested handler could not be loaded"
      icon="lucide:x-circle"
      size="sm"
    />
  </div>
</template>

<script setup lang="ts">

const route = useRoute();
const toast = useToast();
const { confirm } = useConfirm();

const id = route.params.id as string;
const tableName = "route_handler_definition";
const form = ref<Record<string, any>>({});
const errors = ref<Record<string, string>>({});

const hasFormChanges = ref(false);
const formEditorRef = ref();
const { useFormChanges } = useSchema();
const formChanges = useFormChanges();

const { validate, getIncludeFields } = useSchema(tableName);
const { registerPageHeader } = usePageHeaderRegistry();

registerPageHeader({
  title: "Handler Details",
  gradient: "cyan",
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
    id: "reset-handler",
    label: "Reset",
    icon: "lucide:rotate-ccw",
    variant: "outline",
    color: "warning",
    disabled: computed(() => !hasFormChanges.value),
    onClick: handleReset,
    show: computed(() => hasFormChanges.value),
  },
  {
    id: "save-handler",
    label: "Save",
    icon: "lucide:save",
    variant: "solid",
    color: "primary",
    size: "md",
    submit: save,
    loading: computed(() => saveLoading.value),
    disabled: computed(() => form.value?.isSystem || !hasFormChanges.value),
    permission: {
      and: [
        {
          route: "/route_handler_definition",
          actions: ["update"],
        },
      ],
    },
  },
  {
    id: "delete-handler",
    label: "Delete",
    icon: "lucide:trash",
    variant: "solid",
    color: "error",
    size: "md",
    onClick: deleteHandler,
    loading: computed(() => deleteLoading.value),
    disabled: computed(() => form.value?.isSystem || false),
    permission: {
      and: [
        {
          route: "/route_handler_definition",
          actions: ["delete"],
        },
      ],
    },
  },
]);

const {
  data: handlerData,
  pending: loading,
  execute: executeGetHandler,
} = useApi(`/${tableName}`, {
  query: { fields: getIncludeFields(), filter: { id: { _eq: id } } },
  errorContext: "Fetch Handler",
});

const {
  error: saveError,
  execute: executeSaveHandler,
  pending: saveLoading,
} = useApi(`/${tableName}`, {
  method: "patch",
  errorContext: "Save Handler",
});

const {
  error: deleteError,
  execute: executeDeleteHandler,
  pending: deleteLoading,
} = useApi(`/${tableName}`, {
  method: "delete",
  errorContext: "Delete Handler",
});

async function initializeForm() {
  await executeGetHandler();
  const data = handlerData.value?.data?.[0];
  if (data) {
    form.value = { ...data };
    formChanges.update(data);
  }
}

async function save() {
  if (!form.value) return;

  if (Object.keys(errors.value).length > 0) {
    toast.add({
      title: "Validation errors",
      description: "Please fix all errors before saving.",
      color: "error",
    });
    return;
  }

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

  await executeSaveHandler({ id, body: form.value });

  if (saveError.value) {
    return;
  }

  toast.add({
    title: "Success",
    color: "success",
    description: "Handler updated!",
  });
  errors.value = {};

  // Confirm form changes as new baseline
  formEditorRef.value?.confirmChanges();
  formChanges.update(form.value);
}

async function deleteHandler() {
  const ok = await confirm({
    title: "Are you sure?",
    content: "This action cannot be undone.",
  });
  if (!ok) return;

  await executeDeleteHandler({ id });

  if (deleteError.value) {
    return;
  }

  toast.add({ 
    title: "Success",
    description: "Handler deleted successfully", 
    color: "success" 
  });
  await navigateTo("/settings/handlers");
}

onMounted(() => {
  initializeForm();
});
</script>
