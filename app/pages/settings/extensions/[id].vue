<template>
  <div class="space-y-6">
    <div class="max-w-[1000px] lg:max-w-[1000px] md:w-full">
      <CommonFormCard>
        <UForm :state="form" @submit="updateExtension">
          <FormEditorLazy
            ref="formEditorRef"
            v-model="form"
            v-model:errors="errors"
            @has-changed="(hasChanged) => hasFormChanges = hasChanged"
            :table-name="tableName"
            :excluded="['createdAt', 'updatedAt', 'isSystem', 'compiledCode']"
            :field-map="{
              code: { type: 'code', language: 'vue', height: '400px' },
            }"
            :loading="loading"
          />
        </UForm>
      </CommonFormCard>
    </div>
  </div>

  <CommonEmptyState
    v-if="!loading && !extensionData?.data?.[0]"
    title="Extension not found"
    description="The requested extension could not be loaded"
    icon="lucide:puzzle"
    size="sm"
  />

  <!-- Upload Modal -->
  <CommonUploadModalLazy
    v-model="showUploadModal"
    title="Upload Extension"
    accept=".vue"
    :multiple="false"
    :max-size="5 * 1024 * 1024"
    drag-text="Drag and drop your .vue extension file here"
    accept-text="Only .vue files are accepted"
    upload-text="Upload Extension"
    uploading-text="Uploading..."
    :loading="uploadLoading"
    @upload="handleUpload"
    @error="
      (message) =>
        toast.add({
          title: 'Upload Error',
          description: message,
          color: 'error',
        })
    "
  />
</template>

<script setup lang="ts">
definePageMeta({
  layout: "default",
  title: "Extension Detail",
});

const route = useRoute();
const toast = useToast();
const { confirm } = useConfirm();

const tableName = "extension_definition";

const showUploadModal = ref(false);
const uploadLoading = ref(false);

const { validate, getIncludeFields } = useSchema(tableName);
const { registerPageHeader } = usePageHeaderRegistry();

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
    id: "reset-extension",
    label: "Reset",
    icon: "lucide:rotate-ccw",
    variant: "outline",
    color: "warning",
    disabled: computed(() => !hasFormChanges.value),
    onClick: handleReset,
    show: computed(() => hasFormChanges.value),
  },
  {
    id: "save-extension",
    label: "Save",
    icon: "lucide:save",
    variant: "solid",
    color: "primary",
    size: "md",
    submit: updateExtension,
    loading: computed(() => updateLoading.value),
    disabled: computed(() => !hasFormChanges.value),
    permission: {
      and: [
        {
          route: "/extension_definition",
          actions: ["update"],
        },
      ],
    },
  },
  {
    id: "delete-extension",
    label: "Delete",
    icon: "lucide:trash",
    variant: "solid",
    color: "error",
    size: "md",
    onClick: deleteExtension,
    loading: computed(() => deleteLoading.value),
    permission: {
      and: [
        {
          route: "/extension_definition",
          actions: ["delete"],
        },
      ],
    },
  },
  {
    id: "upload-extension",
    label: "Upload",
    icon: "lucide:upload",
    variant: "outline",
    color: "secondary",
    size: "md",
    onClick: () => (showUploadModal.value = true),
    permission: {
      and: [
        {
          route: "/extension_definition",
          actions: ["update"],
        },
      ],
    },
  },
]);

const {
  data: extensionData,
  pending: loading,
  execute: executeGetExtension,
} = useApi(() => `/${tableName}`, {
  query: {
    fields: getIncludeFields(),
    filter: { id: { _eq: route.params.id } },
  },
  errorContext: "Fetch Extension",
});

watch(() => extensionData.value?.data?.[0]?.name, (name) => {
  if (name) {
    registerPageHeader({
      title: `Extension: ${name}`,
      gradient: "purple",
    });
  }
}, { immediate: true });

const {
  error: updateError,
  execute: executeUpdateExtension,
  pending: updateLoading,
} = useApi(() => `/${tableName}`, {
  method: "patch",
  errorContext: "Update Extension",
});

const {
  error: deleteError,
  execute: executeDeleteExtension,
  pending: deleteLoading,
} = useApi(() => `/${tableName}`, {
  method: "delete",
  errorContext: "Delete Extension",
});

const form = ref<Record<string, any>>({});
const errors = ref<Record<string, string>>({});

async function updateExtension() {
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

  await executeUpdateExtension({
    id: route.params.id as string,
    body: form.value,
  });

  if (updateError.value) {
    return;
  }

  toast.add({
    title: "Success",
    color: "success",
    description: "Extension updated!",
  });
  errors.value = {};
  // Confirm form changes as new baseline
  formEditorRef.value?.confirmChanges();
  formChanges.update(form.value);
}

async function deleteExtension() {
  const ok = await confirm({
    title: "Are you sure?",
    content: "This action cannot be undone.",
  });
  if (!ok) return;

  await executeDeleteExtension({ id: route.params.id as string });

  if (deleteError.value) {
    return;
  }

  toast.add({ 
    title: "Success",
    description: "Extension deleted successfully", 
    color: "success" 
  });
  await navigateTo("/settings/extensions");
}

async function handleUpload(files: File | File[]) {
  const fileArray = Array.isArray(files) ? files : [files];
  if (fileArray.length === 0) return;

  uploadLoading.value = true;
  const file = fileArray[0];

  try {
    const content = await file?.text();
    form.value.code = content;
    showUploadModal.value = false;

    toast.add({
      title: "Success",
      description: "Extension code uploaded successfully",
      color: "success",
    });
  } catch (error) {
    toast.add({
      title: "Upload Error",
      description: "Failed to read file content",
      color: "error",
    });
  } finally {
    uploadLoading.value = false;
  }
}

async function initializeForm() {
  await executeGetExtension();
  const data = extensionData.value?.data?.[0];
  if (data) {
    form.value = { ...data };
    formChanges.update(data);
  }
}

onMounted(() => {
  initializeForm();
});
</script>
