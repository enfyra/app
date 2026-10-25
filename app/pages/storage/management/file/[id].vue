<script setup lang="ts">
import type { FeatureCollection, FeatureFileDetail } from '~/types/feature-api';
import type { HeaderAction } from '~/types/ui';
const { register: registerHeaderActions } = useHeaderActionRegistry();

const route = useRoute();
const notify = useNotify();
const { confirm } = useConfirm();
const { updateFileTimestamp } = useGlobalState();
const { getPreviewUrl } = useFileUrl();
const fileId = route.params.id as string;
const { getIdFieldName } = useDatabase();

const {
  data: file,
  pending,
  execute,
} = useApi<FeatureCollection<FeatureFileDetail>>(`/enfyra_file`, {
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
} = useApi(`/enfyra_file`, {
  method: "patch",
  errorContext: "Update File",
});

const {
  error: deleteError,
  execute: executeDeleteFile,
  pending: deleteLoading,
} = useApi(`/enfyra_file`, {
  method: "delete",
  errorContext: "Delete File",
});

const showReplaceModal = ref(false);
const {
  uploadProgress: replaceProgress,
  uploadProgressHeaders,
  beginUploadProgress,
  resetUploadProgress,
} = useFileUploadProgress();

watch(showReplaceModal, (open) => {
  if (!open) {
    resetUploadProgress();
  }
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
    errors.value = {};
    hasFormChanges.value = false;
    formEditorRef.value?.confirmChanges();
    
    notify.success("Reset Complete", "All changes have been discarded.");
  }
}

useUnsavedChangesGuard(() => hasFormChanges.value);

const activeTab = ref<'preview' | 'details' | 'permissions'>('preview');
const permissionManagerRef = ref<{ createNewPermission?: () => unknown } | null>(null);

registerHeaderActions([
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
          route: "/enfyra_file",
          methods: ["DELETE"],
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
    show: computed(() => activeTab.value === 'details'),
    submit: saveFile,
    loading: computed(() => updateLoading.value),
    disabled: computed(() => !hasFormChanges.value),
    permission: {
      and: [
        {
          route: "/enfyra_file",
          methods: ["PATCH"],
        },
      ],
    },
  },
]);

const previewActions: HeaderAction[] = [
  {
    id: "copy-file-url",
    label: "Copy URL",
    icon: "lucide:copy",
    variant: "outline",
    color: "neutral",
    onClick: copyPublicUrl,
    show: computed(() => Boolean(publicFileUrl.value)),
  },
];

const detailActions: HeaderAction[] = [
  {
    id: "replace-file",
    label: "Replace File",
    icon: "lucide:upload",
    variant: "outline",
    color: "secondary",
    onClick: () => (showReplaceModal.value = true),
    permission: {
      and: [
        {
          route: "/enfyra_file",
          methods: ["PATCH"],
        },
      ],
    },
  },
];

const permissionActions: HeaderAction[] = [
  {
    id: "add-file-permission",
    label: "Add Permission",
    icon: "lucide:plus",
    variant: "solid",
    color: "primary",
    onClick: () => permissionManagerRef.value?.createNewPermission?.(),
    permission: {
      or: [{ route: '/enfyra_file_permission', methods: ['POST'] }],
    },
  },
];

const panelSections = computed(() => [
  {
    value: 'preview',
    label: 'Preview',
    icon: 'lucide:eye',
    title: pageTitle.value,
    description: `${fileTypeLabel.value} · ${fileSizeLabel.value}`,
    actions: previewActions,
  },
  {
    value: 'details',
    label: 'Details',
    icon: 'lucide:file-text',
    title: pageTitle.value,
    description: 'View and edit file information',
    actions: detailActions,
  },
  {
    value: 'permissions',
    label: 'Permissions',
    icon: 'lucide:shield',
    title: 'File Permissions',
    description: 'Who can read, update or delete this file.',
    actions: permissionActions,
  },
]);

const fileTypeLabel = computed(() => {
  const mimetype = String(form.value?.mimetype || currentFile.value?.mimetype || '');
  if (mimetype.startsWith('image/')) return 'Image';
  if (mimetype.startsWith('video/')) return 'Video';
  if (mimetype.startsWith('audio/')) return 'Audio';
  if (mimetype.includes('pdf')) return 'PDF';
  if (mimetype.includes('zip') || mimetype.includes('gzip') || mimetype.includes('archive')) return 'Archive';
  if (mimetype.startsWith('text/')) return 'Text';
  return 'File';
});

const fileSizeLabel = computed(() => {
  const bytes = Number(form.value?.filesize ?? currentFile.value?.filesize ?? 0);
  if (!Number.isFinite(bytes) || bytes <= 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value >= 10 || unit === 0 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`;
});

const updatedAtLabel = computed(() => {
  const raw = currentFile.value?.updatedAt || currentFile.value?.createdAt;
  if (!raw) return '—';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
});

const previewUrl = computed(() => (isImageFile.value ? getPreviewUrl(fileId) : ''));
const publicFileUrl = computed(() => currentFile.value?.location || currentFile.value?.url || '');

function openOriginal() {
  if (previewUrl.value) window.open(previewUrl.value, '_blank');
}

async function copyPublicUrl() {
  if (!publicFileUrl.value) return;
  await navigator.clipboard.writeText(publicFileUrl.value);
  notify.success('Copied', 'File URL copied to clipboard.');
}

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

  hasFormChanges.value = false;
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

  beginUploadProgress();
  await executeUpdateFile({
    id: fileId,
    body: formData,
    headers: uploadProgressHeaders.value,
  });

  if (updateError.value) {
    resetUploadProgress();
    return;
  }

  showReplaceModal.value = false;
  resetUploadProgress();
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
      color: "text-[var(--st-info)]",
      background: "bg-[var(--state-info-soft-bg)]",
    };
  if (mimetype.startsWith("video/"))
    return {
      icon: "lucide:video",
      color: "text-[var(--accent-fuchsia)]",
      background: "bg-[color-mix(in_srgb,var(--accent-fuchsia)_14%,transparent)]",
    };
  if (mimetype.startsWith("audio/"))
    return {
      icon: "lucide:music",
      color: "text-[var(--st-success)]",
      background: "bg-[var(--state-success-soft-bg)]",
    };
  if (mimetype.includes("pdf"))
    return {
      icon: "lucide:file-text",
      color: "text-[var(--md-error)]",
      background: "bg-[var(--state-danger-soft-bg)]",
    };
  if (mimetype.includes("zip") || mimetype.includes("archive"))
    return {
      icon: "lucide:archive",
      color: "text-[var(--st-warning)]",
      background: "bg-[var(--state-warning-soft-bg)]",
    };
  if (mimetype.startsWith("text/"))
    return {
      icon: "lucide:file-text",
      color: "text-[var(--accent-cyan)]",
      background: "bg-[color-mix(in_srgb,var(--accent-cyan)_14%,transparent)]",
    };
  return {
    icon: "lucide:file",
    color: "text-[var(--text-secondary)]",
    background: "bg-[var(--surface-muted)]",
  };
}
</script>

<template>
  <div class="eapp-page-constrained">
    <CommonPanel v-model="activeTab" :sections="panelSections" class="w-full">
      <template #preview>
        <div class="grid w-full min-w-0 gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
          <div class="eapp-bordered-region flex min-h-[320px] items-center justify-center overflow-hidden bg-[var(--surface-muted)] p-3 sm:min-h-[420px] sm:p-6 lg:min-h-[560px]">
            <CommonLazyImage
              v-if="isImageFile"
              :src="previewUrl"
              :alt="form.filename"
              class="max-h-[520px] w-full"
              container-class="flex h-full w-full items-center justify-center"
              object-fit="contain"
              loading-area="custom"
              custom-loading-size="280px"
            />
            <div
              v-else
              class="flex items-center justify-center"
            >
              <div
                :class="[fileIcon.background, 'flex size-28 items-center justify-center rounded-[var(--radius-panel)] sm:size-32']"
              >
                <UIcon :name="fileIcon.icon" :class="fileIcon.color" size="64" />
              </div>
            </div>
          </div>

          <div class="eapp-bordered-region flex min-w-0 flex-col divide-y divide-[var(--border-default)]">
            <dl class="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-3 p-4 text-sm">
              <dt class="text-[var(--text-tertiary)]">MIME type</dt>
              <dd class="min-w-0 truncate text-right font-medium text-[var(--text-primary)]" :title="form.mimetype">{{ form.mimetype || '—' }}</dd>
              <dt class="text-[var(--text-tertiary)]">Size</dt>
              <dd class="text-right font-medium text-[var(--text-primary)]">{{ fileSizeLabel }}</dd>
              <dt class="text-[var(--text-tertiary)]">Storage</dt>
              <dd class="min-w-0 truncate text-right font-medium text-[var(--text-primary)]" :title="storageType">{{ storageType }}</dd>
              <dt class="text-[var(--text-tertiary)]">Updated</dt>
              <dd class="text-right font-medium text-[var(--text-primary)]">{{ updatedAtLabel }}</dd>
            </dl>

            <div v-if="publicFileUrl" class="min-w-0 p-4">
              <p class="text-xs font-medium uppercase tracking-wide text-[var(--text-tertiary)]">Location</p>
              <p class="mt-1 break-all font-mono text-xs text-[var(--text-secondary)]">{{ publicFileUrl }}</p>
            </div>

            <div v-if="isImageFile" class="mt-auto flex flex-wrap items-center gap-2 p-4">
              <UButton icon="lucide:external-link" size="sm" variant="outline" color="neutral" label="Open original" @click="openOriginal" />
            </div>
          </div>
        </div>
      </template>
      <template #details>
        <CommonFormCard class="w-full">
          <UForm :state="form" @submit="saveFile">
            <FormEditorLazy
              ref="formEditorRef"
              v-model="form"
              v-model:errors="errors"
              @has-changed="(hasChanged) => hasFormChanges = hasChanged"
              table-name="enfyra_file"
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
        </CommonFormCard>
      </template>
      <template #permissions>
        <div class="w-full min-w-0">
        <PermissionManager
          ref="permissionManagerRef"
          table-name="enfyra_file_permission"
          :current-field-id="{ field: 'file', value: fileId }"
          icon="lucide:shield"
          title="File Permissions"
          :show-header="false"
        />
        </div>
      </template>
    </CommonPanel>

    <LazyCommonUploadModal
      v-if="showReplaceModal"
      v-model="showReplaceModal"
      :title="`Replace ${form.filename || 'File'}`"
      :multiple="false"
      :loading="updateLoading"
      :upload-progress="replaceProgress"
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
    </LazyCommonUploadModal>
  </div>
</template>
