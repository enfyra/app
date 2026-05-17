<script setup lang="ts">

const route = useRoute();
const router = useRouter();
const notify = useNotify();
const { confirm } = useConfirm();
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
    
    notify.success("Reset Complete", "All changes have been discarded.");
  }
}

useHeaderActionRegistry([
  {
    id: "reset-file",
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
    id: "delete-file",
    label: "Delete",
    icon: "lucide:trash",
    variant: "solid",
    color: "error",
    size: "md",
    order: 2,
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
    order: 999,
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

  const freshData = file.value?.data?.[0];
  if (freshData) {
    form.value = { ...freshData };
    formChanges.update(freshData);
  }

  notify.success("Success", "File updated successfully!");

  formEditorRef.value?.confirmChanges();
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

  notify.success("Success", "File deleted successfully");
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

  notify.success("Success", "File replaced successfully!");
}

const pageTitle = computed(() => {
  if (pending.value) return "Loading...";
  return file.value?.data?.[0]?.filename || "File Details";
});

const currentFile = computed(() => file.value?.data?.[0] || form.value || {});
const isImageFile = computed(() => form.value?.mimetype?.startsWith("image/"));
const fileIcon = computed(() => getFileIconAndColor(form.value?.mimetype || ""));
const storageName = computed(
  () => currentFile.value?.storageConfig?.name || "Local"
);
const storageType = computed(
  () => currentFile.value?.storageConfig?.type || "Local Storage"
);

function getFileIconAndColor(mimetype: string): {
  icon: string;
  color: string;
  background: string;
} {
  if (!mimetype)
    return {
      icon: "lucide:file",
      color: "text-[var(--text-secondary)]",
      background: "bg-[var(--surface-muted)]",
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
    color: "text-[var(--text-secondary)]",
    background: "bg-[var(--surface-muted)]",
  };
}
</script>

<template>
  <div class="grid max-w-[1400px] gap-6 xl:grid-cols-[minmax(360px,520px)_1fr]">
    <aside class="space-y-4 xl:sticky xl:top-6 xl:self-start">
      <div class="surface-card overflow-hidden rounded-xl">
        <div class="border-b border-[var(--border-default)] px-5 py-4">
          <div class="flex items-center justify-between gap-3">
            <div class="min-w-0">
              <p class="text-sm font-medium text-[var(--text-tertiary)]">
                Preview
              </p>
              <h2 class="truncate text-lg font-semibold text-[var(--text-primary)]">
                {{ pageTitle }}
              </h2>
            </div>
            <UBadge variant="subtle" color="neutral" size="sm">
              {{ storageName }}
            </UBadge>
          </div>
        </div>

        <div class="bg-[var(--surface-muted)] p-4">
          <div
            v-if="isImageFile"
            class="flex min-h-[360px] items-center justify-center overflow-hidden rounded-lg bg-[var(--surface-default)]"
          >
            <CommonLazyImage
              :src="getPreviewUrl(fileId)"
              :alt="form.filename"
              class="h-full max-h-[520px] w-full"
              container-class="h-full w-full"
              object-fit="contain"
              loading-area="custom"
              custom-loading-size="300px"
            />
          </div>

          <div
            v-else
            class="flex min-h-[360px] items-center justify-center rounded-lg bg-[var(--surface-default)]"
          >
            <div
              :class="[
                fileIcon.background,
                'flex h-36 w-36 items-center justify-center rounded-3xl',
              ]"
            >
              <UIcon :name="fileIcon.icon" :class="fileIcon.color" size="72" />
            </div>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3 border-t border-[var(--border-default)] p-4 text-sm">
          <div class="rounded-lg bg-[var(--surface-muted)] p-3">
            <p class="text-xs text-[var(--text-quaternary)]">Type</p>
            <p class="truncate font-medium text-[var(--text-primary)]">
              {{ form.mimetype || "Unknown" }}
            </p>
          </div>
          <div class="rounded-lg bg-[var(--surface-muted)] p-3">
            <p class="text-xs text-[var(--text-quaternary)]">Storage</p>
            <p class="truncate font-medium text-[var(--text-primary)]">
              {{ storageType }}
            </p>
          </div>
        </div>
      </div>
    </aside>

    <div class="space-y-6">
      <div class="surface-card rounded-xl p-6">
        <div class="mb-5 flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <UIcon name="lucide:edit-3" class="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 class="text-lg font-semibold text-[var(--text-primary)]">
              File information
            </h3>
            <p class="text-sm text-[var(--text-tertiary)]">
              Metadata, publishing state, and display fields.
            </p>
          </div>
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

      <div class="surface-card rounded-xl p-6">
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
