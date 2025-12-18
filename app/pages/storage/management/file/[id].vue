<script setup lang="ts">

const route = useRoute();
const router = useRouter();
const toast = useToast();
const { confirm } = useConfirm();
const { isMounted } = useMounted();
const { updateFileTimestamp } = useGlobalState();
const { getPreviewUrl } = useFileUrl();
const fileId = route.params.id as string;
const { registerPageHeader } = usePageHeaderRegistry();
const { getIdFieldName } = useDatabase();

const {
  data: file,
  pending,
  error,
  execute,
} = useApi(`/file_definition`, {
  query: computed(() => {
    const idField = getIdFieldName();
    return {
    filter: {
        [idField]: {
        _eq: fileId,
      },
    },
    };
  }),
  errorContext: "Fetch File",
});

watch(() => file.value?.data?.[0]?.filename, (filename) => {
  if (filename) {
    registerPageHeader({
      title: filename,
      description: "View and edit file information",
      gradient: "cyan",
    });
  }
}, { immediate: true });

const form = ref<Record<string, any>>({});
const errors = ref<Record<string, string>>({});
const hasFormChanges = ref(false);
const formEditorRef = ref();
const { useFormChanges } = useSchema();
const formChanges = useFormChanges();

const {
  error: updateError,
  execute: executeUpdateFile,
  pending: updateLoading,
} = useApi(`/file_definition`, {
  method: "patch",
  errorContext: "Update File",
});

const {
  error: deleteError,
  execute: executeDeleteFile,
  pending: deleteLoading,
} = useApi(`/file_definition`, {
  method: "delete",
  errorContext: "Delete File",
});

const showReplaceModal = ref(false);

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
    id: "reset-file",
    label: "Reset",
    icon: "lucide:rotate-ccw",
    variant: "outline",
    color: "warning",
    disabled: computed(() => !hasFormChanges.value),
    onClick: handleReset,
    show: computed(() => hasFormChanges.value),
  },
  {
    id: "delete-file",
    label: "Delete",
    icon: "lucide:trash",
    variant: "solid",
    color: "error",
    size: "md",
    onClick: deleteFile,
    loading: computed(() => deleteLoading.value),
    permission: {
      and: [
        {
          route: "/file_definition",
          actions: ["delete"],
        },
      ],
    },
  },
  {
    id: "save-file",
    label: "Save",
    icon: "lucide:save",
    variant: "solid",
    color: "primary",
    size: "md",
    submit: saveFile,
    loading: computed(() => updateLoading.value),
    disabled: computed(() => !hasFormChanges.value),
    permission: {
      and: [
        {
          route: "/file_definition",
          actions: ["update"],
        },
      ],
    },
  },
]);

useSubHeaderActionRegistry([
  {
    id: "replace-file",
    label: "Replace File",
    icon: "lucide:upload",
    variant: "outline",
    color: "secondary",
    size: "md",
    onClick: () => (showReplaceModal.value = true),
    permission: {
      and: [
        {
          route: "/file_definition",
          actions: ["update"],
        },
      ],
    },
  },
]);

async function initializeForm() {
  await execute();
  const data = file.value?.data?.[0];
  if (data) {
    form.value = { ...data };
    formChanges.update(data);
  }
}

onMounted(() => {
  initializeForm();
});

async function saveFile() {
  await executeUpdateFile({
    id: fileId,
    body: form.value,
  });

  if (updateError.value) {
    return;
  }

  await execute();

  const toast = useToast();
  toast.add({
    title: "Success",
    description: "File updated successfully!",
    color: "success",
  });

  formEditorRef.value?.confirmChanges();
  formChanges.update(form.value);
}

async function deleteFile() {
  const ok = await confirm({
    title: "Are you sure?",
    content: "This action cannot be undone.",
  });
  if (!ok) return;

  await executeDeleteFile({ id: fileId });

  if (deleteError.value) {
    return;
  }

  toast.add({
    title: "Success",
    description: "File deleted successfully",
    color: "success",
  });
  await navigateTo("/storage/management");
}

async function handleReplaceFileSuccess(files: File | File[]) {
  const fileArray = Array.isArray(files) ? files : [files];
  if (fileArray.length === 0) return;

  const newFile = fileArray[0];
  if (!newFile) return;

  const formData = new FormData();
  formData.append("file", newFile);

  await executeUpdateFile({
    id: fileId,
    body: formData,
  });

  if (updateError.value) {
    return;
  }

  showReplaceModal.value = false;
  await initializeForm();

  updateFileTimestamp(fileId);

  toast.add({
    title: "Success",
    description: "File replaced successfully!",
    color: "success",
  });
}

const pageTitle = computed(() => {
  if (pending.value) return "Loading...";
  return file.value?.data?.[0]?.filename || "File Details";
});

function getFileIconAndColor(mimetype: string): {
  icon: string;
  color: string;
  background: string;
} {
  if (!mimetype)
    return {
      icon: "lucide:file",
      color: "text-gray-600 dark:text-gray-300",
      background: "bg-gray-100 dark:bg-gray-800",
    };

  if (mimetype.startsWith("image/"))
    return {
      icon: "lucide:image",
      color: "text-blue-600 dark:text-blue-300",
      background: "bg-blue-100 dark:bg-blue-500/20",
    };
  if (mimetype.startsWith("video/"))
    return {
      icon: "lucide:video",
      color: "text-purple-600 dark:text-purple-300",
      background: "bg-purple-100 dark:bg-purple-500/20",
    };
  if (mimetype.startsWith("audio/"))
    return {
      icon: "lucide:music",
      color: "text-green-600 dark:text-green-300",
      background: "bg-green-100 dark:bg-green-500/20",
    };
  if (mimetype.includes("pdf"))
    return {
      icon: "lucide:file-text",
      color: "text-red-600 dark:text-red-300",
      background: "bg-red-100 dark:bg-red-900/30",
    };
  if (mimetype.includes("zip") || mimetype.includes("archive"))
    return {
      icon: "lucide:archive",
      color: "text-yellow-600 dark:text-yellow-300",
      background: "bg-yellow-100 dark:bg-yellow-900/30",
    };
  if (mimetype.startsWith("text/"))
    return {
      icon: "lucide:file-text",
      color: "text-cyan-600 dark:text-cyan-300",
      background: "bg-cyan-100 dark:bg-cyan-900/30",
    };
  return {
    icon: "lucide:file",
    color: "text-gray-600 dark:text-gray-300",
    background: "bg-gray-100 dark:bg-gray-800",
  };
}
</script>

<template>
  <div class="max-w-[1000px] lg:max-w-[1000px] md:w-full space-y-6">
    
    <div class="space-y-6">
      
      <div
        class="bg-white dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700/50 shadow-xl overflow-hidden"
        v-if="!pending || !isMounted"
      >
        <div class="flex justify-center p-4">
          <div
            v-if="form.mimetype?.startsWith('image/')"
            class="max-w-full max-h-132 w-full"
          >
            <CommonImage
              :src="getPreviewUrl(fileId)"
              :alt="form.filename"
              class="object-contain h-full w-full max-w-132 max-h-132 mx-auto rounded-lg"
              loading-area="custom"
              custom-loading-size="300px"
            />
          </div>

          <div v-else class="text-center">
            <div
              :class="[
                getFileIconAndColor(form.mimetype).background,
                'w-100 h-100 rounded-2xl flex items-center justify-center mx-auto',
              ]"
            >
              <UIcon
                :name="getFileIconAndColor(form.mimetype).icon"
                :class="getFileIconAndColor(form.mimetype).color"
                size="192"
              />
            </div>
          </div>
        </div>
      </div>

      <div
        class="space-y-4 bg-white dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700/50 p-6"
      >
        <div class="flex items-center gap-3">
          <UIcon name="lucide:edit-3" class="w-5 h-5" />
          <h3 class="text-lg font-semibold">Edit File Information</h3>
        </div>

        <UForm :state="form" @submit="saveFile">
          <FormEditorLazy
            ref="formEditorRef"
            v-model="form"
            v-model:errors="errors"
            @has-changed="(hasChanged) => hasFormChanges = hasChanged"
            table-name="file_definition"
            :excluded="[
              'createdAt',
              'updatedAt',
              'permissions',
              'folder',
              'storageConfig',
            ]"
            :loading="pending"
          />
        </UForm>
      </div>

      <div class="bg-white dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700/50 p-6">
        <PermissionManager
          table-name="file_permission_definition"
          :current-field-id="{ field: 'file', value: fileId }"
          icon="lucide:shield"
          title="File Permissions"
        />
      </div>
    </div>

    <CommonUploadModal
      v-model="showReplaceModal"
      :title="`Replace ${form.filename || 'File'}`"
      :multiple="false"
      :loading="updateLoading"
      @upload="handleReplaceFileSuccess"
    >
      <template #warning>
        <UAlert
          description="This action will replace the current file immediately when you click Upload. The old file will be permanently lost."
          icon="lucide:alert-triangle"
          color="warning"
          variant="soft"
          class="mb-4"
          :ui="{
            icon: 'text-[36px]',
          }"
        />
      </template>
    </CommonUploadModal>
  </div>
</template>
