<template>
  <div class="space-y-6">
    <div class="max-w-[1000px] lg:max-w-[1000px] md:w-full">
      <CommonFormCard>
        <UForm :state="createForm" @submit="handleCreate">
          <FormEditorLazy
            v-model="createForm"
            :table-name="tableName"
            :errors="createErrors"
            :excluded="['compiledCode', 'createdBy', 'updatedBy', 'extensionId']"
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
          notify.error('Upload Error', message)
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

const notify = useNotify();

const tableName = "extension_definition";

const createForm = ref<Record<string, any>>({});
const createErrors = ref<Record<string, string>>({});

const showUploadModal = ref(false);
const uploadLoading = ref(false);
const showPreviewModal = ref(false);

const { generateEmptyForm } = useSchema(tableName);
const { validateForm } = useFormValidation(tableName);
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
    order: 10,
    onClick: () => (showPreviewModal.value = true),
    disabled: computed(() => !createForm.value?.code),
  },
  {
  id: "save-extension",
  label: "Save",
  icon: "lucide:save",
  variant: "solid",
  color: "primary",
  order: 999,
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
  if (!await validateForm(createForm.value, createErrors)) return;

  const { me } = useAuth();
  const { getIdFieldName } = useDatabase();
  const idField = getIdFieldName();
  const { extensionId, compiledCode, ...rest } = createForm.value;
  const body = {
    ...rest,
    createdBy: { [idField]: (me.value as any)?.[idField] }
  };

  await executeCreateExtension({ body });

  if (createError.value) {
    return;
  }

  notify.success("Extension created successfully");

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

      notify.success("File Loaded", `File "${file.name}" content has been loaded into the code field`);
    }

    showUploadModal.value = false;
  } catch (error) {
    notify.error("Upload Error", "Failed to read file content");
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
