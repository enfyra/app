<template>
  <div class="space-y-6">
    <div class="max-w-[1000px] lg:max-w-[1000px] md:w-full">
      <CommonFormCard>
        <UForm :state="createForm" @submit="handleCreate">
          <FormEditorLazy
            v-model="createForm"
            :table-name="tableName"
            :errors="createErrors"
            :excluded="['compiledCode']"
            :field-map="{
              code: { type: 'code', language: 'vue', height: '400px' },
            }"
            @update:errors="(errors) => (createErrors = errors)"
            mode="create"
          />
        </UForm>
      </CommonFormCard>
    </div>

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

    <ExtensionPreviewModal
      v-model="showPreviewModal"
      :code="createForm?.code || ''"
    />
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: "default",
  title: "Create Extension",
});

const toast = useToast();

const tableName = "extension_definition";

const createForm = ref<Record<string, any>>({});
const createErrors = ref<Record<string, string>>({});

const showUploadModal = ref(false);
const uploadLoading = ref(false);
const showPreviewModal = ref(false);

const { generateEmptyForm, validate } = useSchema(tableName);
const { registerPageHeader } = usePageHeaderRegistry();

registerPageHeader({
  title: "Create New Extension",
  gradient: "purple",
});

useHeaderActionRegistry([
  {
    id: "upload-extension",
    label: "Upload",
    icon: "lucide:upload",
    variant: "solid",
    color: "secondary",
    onClick: () => (showUploadModal.value = true),
    permission: {
      and: [
        {
          route: "/extension_definition",
          actions: ["create"],
        },
      ],
    },
  },
  {
    id: "preview-extension",
    label: "Preview",
    icon: "lucide:eye",
    variant: "outline",
    color: "primary",
    size: "md",
    onClick: () => (showPreviewModal.value = true),
    disabled: computed(() => !createForm.value?.code),
  },
  {
  id: "save-extension",
  label: "Save",
  icon: "lucide:save",
  variant: "solid",
  color: "primary",
  submit: handleCreate,
  loading: computed(() => createLoading.value),
  permission: {
    and: [
      {
        route: "/extension_definition",
        actions: ["create"],
      },
    ],
  },
      },
]);

const {
  data: createData,
  error: createError,
  execute: executeCreateExtension,
  pending: createLoading,
} = useApi(() => `/${tableName}`, {
  method: "post",
  errorContext: "Create Extension",
});

onMounted(() => {
  createForm.value = generateEmptyForm();
});

async function handleCreate() {
  const { isValid, errors } = validate(createForm.value);

  if (!isValid) {
    createErrors.value = errors;
    toast.add({
      title: "Error",
      description: "Please check the fields with errors.",
      color: "error",
    });
    return;
  }

  await executeCreateExtension({ body: createForm.value });

  if (createError.value) {
    return;
  }

  toast.add({
    title: "Extension created successfully",
    color: "success",
  });

  const { getId } = useDatabase();
  await navigateTo(`/settings/extensions/${getId(createData.value.data[0])}`, {
    replace: true,
  });
}

async function handleUpload(files: File | File[]) {
  const fileArray = Array.isArray(files) ? files : [files];

  try {
    uploadLoading.value = true;

    for (const file of fileArray) {
      
      const fileContent = await readFileContent(file);
      createForm.value.code = fileContent;

      toast.add({
        title: "File Loaded",
        description: `File "${file.name}" content has been loaded into the code field`,
        color: "success",
      });
    }

    showUploadModal.value = false;
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

function readFileContent(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const content = e.target?.result as string;
      resolve(content);
    };

    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };

    reader.readAsText(file);
  });
}
</script>
