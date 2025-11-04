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
      v-if="!loading && !scriptData?.data?.[0]"
      title="Bootstrap script not found"
      description="The requested bootstrap script could not be loaded"
      icon="lucide:rocket-x"
      size="sm"
    />
  </div>
</template>

<script setup lang="ts">

const route = useRoute();
const toast = useToast();
const { confirm } = useConfirm();

const id = route.params.id as string;
const tableName = "bootstrap_script_definition";
const form = ref<Record<string, any>>({});
const errors = ref<Record<string, string>>({});

const hasFormChanges = ref(false);
const formEditorRef = ref();
const { useFormChanges } = useSchema();
const formChanges = useFormChanges();

const { validate, getIncludeFields } = useSchema(tableName);
const { registerPageHeader } = usePageHeaderRegistry();

registerPageHeader({
  title: "Bootstrap Script Details",
  gradient: "purple",
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
    id: "reset-bootstrap",
    label: "Reset",
    icon: "lucide:rotate-ccw",
    variant: "outline",
    color: "warning",
    disabled: computed(() => !hasFormChanges.value),
    onClick: handleReset,
    show: computed(() => hasFormChanges.value),
  },
  {
    id: "save-bootstrap",
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
          route: "/bootstrap_script_definition",
          actions: ["update"],
        },
      ],
    },
  },
  {
    id: "delete-bootstrap",
    label: "Delete",
    icon: "lucide:trash",
    variant: "solid",
    color: "error",
    size: "md",
    onClick: deleteScript,
    loading: computed(() => deleteLoading.value),
    disabled: computed(() => form.value?.isSystem || false),
    permission: {
      and: [
        {
          route: "/bootstrap_script_definition",
          actions: ["delete"],
        },
      ],
    },
  },
]);

const {
  data: scriptData,
  pending: loading,
  execute: executeGetScript,
} = useApi(`/${tableName}`, {
  query: { fields: getIncludeFields(), filter: { id: { _eq: id } } },
  errorContext: "Fetch Bootstrap Script",
});

const {
  error: saveError,
  execute: executeSaveScript,
  pending: saveLoading,
} = useApi(`/${tableName}`, {
  method: "patch",
  errorContext: "Save Bootstrap Script",
});

const {
  error: deleteError,
  execute: executeDeleteScript,
  pending: deleteLoading,
} = useApi(`/${tableName}`, {
  method: "delete",
  errorContext: "Delete Bootstrap Script",
});

async function initializeForm() {
  await executeGetScript();
  const data = scriptData.value?.data?.[0];
  if (data) {
    form.value = { ...data };
    formChanges.update(data);
  }
}

async function save() {
  if (!form.value) return;

  // Set updatedBy to current user
  const { me } = useEnfyraAuth();
  const { getId } = useDatabase();
  const userId = getId(me.value);
  if (userId) {
    form.value.updatedBy = { id: userId };
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

  await executeSaveScript({ id, body: form.value });

  if (saveError.value) {
    return;
  }

  toast.add({
    title: "Success",
    color: "success",
    description: "Bootstrap script updated!",
  });
  errors.value = {};

  // Confirm form changes as new baseline
  formEditorRef.value?.confirmChanges();
  formChanges.update(form.value);
}

async function deleteScript() {
  const ok = await confirm({
    title: "Are you sure?",
    content: "This action cannot be undone.",
  });
  if (!ok) return;

  await executeDeleteScript({ id });

  if (deleteError.value) {
    return;
  }

  toast.add({ 
    title: "Success",
    description: "Bootstrap script deleted successfully", 
    color: "success" 
  });
  await navigateTo("/settings/bootstrap");
}

onMounted(() => {
  initializeForm();
});
</script>
