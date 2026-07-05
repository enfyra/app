<script setup lang="ts">
const { register: registerHeaderActions } = useHeaderActionRegistry();
const showCreateModal = ref(false);
const showUploadModal = ref(false);
const selectedStorage = ref<{ label: string; value: string; icon: string; isDefault: boolean }>();
const fileUploadProgressByIndex = ref<Record<number, number | null>>({});
const uploadFileSizes = ref<number[]>([]);
const {
  trackedUploadProgressById,
  beginTrackedUploadProgress,
  getUploadProgressHeaders,
  resetUploadProgress,
} = useFileUploadProgress();

const route = useRoute();
const {
  storageConfigs,
  storageConfigsFetched,
  storageConfigsPending,
  storageConfigsError,
  fetchStorageConfigs
} = useGlobalState();
const router = useRouter();
const { getId, getIdFieldName } = useDatabase();
const folderPage = ref(Number(route.query.folderPage) || 1);
const filePage = ref(Number(route.query.filePage) || 1);
const limit = 20;

const { getIncludeFields: getFileFields } = useSchema("enfyra_file");

const idField = computed(() => getIdFieldName());

const {
  data: rootFolders,
  pending: rootPending,
  execute: fetchRootFolders,
} = useApi(() => `enfyra_folder`, {
  query: computed(() => {
    return {
      limit,
      page: folderPage.value,
      meta: "*",
      sort: "-order,-createdAt",
      filter: {
        parent: {
          [idField.value]: {
            _is_null: true,
          },
        },
      },
    };
  }),
  errorContext: "Load Root Folders",
});

const {
  data: rootFiles,
  pending: filesPending,
  execute: fetchRootFiles,
} = useApi(() => `enfyra_file`, {
  query: computed(() => {
    return {
      fields: getFileFields(),
      limit,
      page: filePage.value,
      meta: "*",
      sort: "-createdAt",
      filter: {
        folder: {
          [idField.value]: {
            _is_null: true,
          },
        },
      },
    };
  }),
  errorContext: "Load Root Files",
});

const {
  execute: uploadFilesApi,
  error: uploadError,
  pending: uploadPending,
} = useApi(() => `enfyra_file`, {
  method: "post",
  errorContext: "Upload Files",
});

const folders = computed(() => rootFolders.value?.data || []);
const folderTotal = computed(() => rootFolders.value?.meta?.filterCount || 0);

const files = computed(() => rootFiles.value?.data || []);
const fileTotal = computed(() => rootFiles.value?.meta?.filterCount || 0);

const storageOptions = computed(() => {
  return storageConfigs.value.map((config) => {
    const storageType = config.type || "Local Storage";
    const isCloudStorage = storageType === 'Amazon S3' || storageType === 'Google Cloud Storage' || storageType === 'Cloudflare R2';
    return {
      label: config.isDefault ? `${config.name} (Default)` : config.name,
      value: getId(config),
      icon: isCloudStorage ? 'lucide:cloud' : 'lucide:hard-drive',
      isDefault: config.isDefault === true,
    };
  });
});

function selectDefaultStorageConfig() {
  const defaultOption = storageOptions.value.find((option) => option.isDefault);
  if (defaultOption) {
    selectedStorage.value = defaultOption;
  }
}

const aggregateUploadProgress = computed(() => {
  if (uploadFileSizes.value.length === 0) return null;
  const totalBytes = uploadFileSizes.value.reduce((sum, value) => sum + value, 0);
  if (totalBytes <= 0) return 0;
  const loadedBytes = uploadFileSizes.value.reduce((sum, size, index) => {
    const progress = fileUploadProgressByIndex.value[index] ?? 0;
    return sum + (size * progress) / 100;
  }, 0);
  return Math.min(100, Math.max(0, Math.round((loadedBytes / totalBytes) * 100)));
});

watch(showUploadModal, async (open) => {
  if (!open) {
    fileUploadProgressByIndex.value = {};
    uploadFileSizes.value = [];
    resetUploadProgress();
    return;
  }
  if (storageConfigsFetched.value) {
    selectDefaultStorageConfig();
    return;
  }
  await fetchStorageConfigs();
  selectDefaultStorageConfig();
});

watch(
  () => route.query.folderPage,
  async (newPage) => {
    folderPage.value = Number(newPage) || 1;
    await fetchRootFolders();
  },
  { immediate: true }
);

watch(
  () => route.query.filePage,
  async (newPage) => {
    filePage.value = Number(newPage) || 1;
    await fetchRootFiles();
  },
  { immediate: true }
);

function handleFolderCreated() {
  fetchRootFolders();
  fetchRootFiles();
}

async function handleRefreshItems() {
  await Promise.all([fetchRootFolders(), fetchRootFiles()]);

  let newQuery = { ...route.query };

  if (folders.value.length === 0 && folderPage.value > 1) {
    folderPage.value = 1;
    delete newQuery.folderPage;
  }

  if (files.value.length === 0 && filePage.value > 1) {
    filePage.value = 1;
    delete newQuery.filePage;
  }

  if (newQuery !== route.query) {
    await router.replace({ query: newQuery });
  }
}

async function handleFileUpload(files: File | File[]) {
  const fileArray = Array.isArray(files) ? files : [files];
  uploadFileSizes.value = fileArray.map((file) => file.size);
  fileUploadProgressByIndex.value = Object.fromEntries(
    fileArray.map((_, index) => [index, 0]),
  );

  const formDataArray = fileArray.map((file) => {
    const formData = new FormData();
    formData.append("file", file);
    if (selectedStorage.value) {
      formData.append("storageConfig", selectedStorage.value.value);
    }
    return formData;
  });

  const uploadIds = formDataArray.map(() => beginTrackedUploadProgress());
  const stopFileProgressWatch = watch(
    trackedUploadProgressById,
    (progressById) => {
      fileUploadProgressByIndex.value = Object.fromEntries(
        uploadIds.map((id, index) => [index, progressById[id] ?? 0]),
      );
    },
    { immediate: true },
  );

  try {
    await uploadFilesApi({
      files: formDataArray,
      headersByIndex: Object.fromEntries(
        uploadIds.map((id, index) => [index, getUploadProgressHeaders(id)]),
      ),
    });
  } finally {
    stopFileProgressWatch();
  }

  if (uploadError.value) {
    resetUploadProgress();
    return;
  }

  fileUploadProgressByIndex.value = Object.fromEntries(
    fileArray.map((_, index) => [index, 100]),
  );

  await fetchRootFiles();

  showUploadModal.value = false;
  selectedStorage.value = undefined;
  fileUploadProgressByIndex.value = {};
  uploadFileSizes.value = [];
  resetUploadProgress();

  useNotify().success("Success", `${fileArray.length} file(s) uploaded successfully`);
}

const { registerPageHeader } = usePageHeaderRegistry();

registerPageHeader({
  title: "File Manager",
  description: "Organize your files and documents efficiently",
  gradient: "cyan",
});

registerHeaderActions([
  {
    id: "upload-files",
    label: "Upload Files",
    icon: "lucide:upload",
    onClick: () => {
      showUploadModal.value = true;
    },
    side: "right",
    color: "primary",
    permission: {
      and: [
        {
          route: "/enfyra_file",
          methods: ["POST"],
        },
      ],
    },
  },
  {
    id: "create-folder",
    label: "New Folder",
    icon: "lucide:folder-plus",
    onClick: () => {
      showCreateModal.value = true;
    },
    side: "right",
    color: "secondary",
    permission: {
      and: [
        {
          route: "/enfyra_folder",
          methods: ["POST"],
        },
      ],
    },
  },
]);
</script>

<template>
  <div class="space-y-8">
    
    <FileManager
      :folders="folders"
      :files="files"
      :folders-loading="rootPending"
      :files-loading="filesPending"
      empty-title="No items yet"
      empty-description="Create folders or upload files to get started organizing your content."
      :show-create-button="true"
      @refresh-items="handleRefreshItems"
      @refresh-folders="fetchRootFolders"
      @refresh-files="fetchRootFiles"
      @create-folder="showCreateModal = true"
    />

    <div
      v-if="folderTotal > limit || fileTotal > limit"
      class="mt-6 flex flex-col justify-center gap-4 lg:flex-row"
    >
      <div v-if="folderTotal > limit" class="flex items-center gap-2">
        <span class="text-sm text-[var(--text-tertiary)]">Folders:</span>
        <CommonPaginationBar
          v-model:page="folderPage"
          align="center"
          :items-per-page="limit"
          :total="folderTotal"
          :loading="rootPending"
          :show-range="false"
          :to="(p) => ({ path: route.path, query: { ...route.query, folderPage: p } })"
          color="secondary"
          active-color="secondary"
        />
      </div>

      <div v-if="fileTotal > limit" class="flex items-center gap-2">
        <span class="text-sm text-[var(--text-tertiary)]">Files:</span>
        <CommonPaginationBar
          v-model:page="filePage"
          align="center"
          :items-per-page="limit"
          :total="fileTotal"
          :loading="filesPending"
          :show-range="false"
          :to="(p) => ({ path: route.path, query: { ...route.query, filePage: p } })"
          color="secondary"
          active-color="secondary"
        />
      </div>
    </div>

    <CommonUploadModal
      v-model="showUploadModal"
      title="Upload Files"
      :multiple="true"
      accept="*/*"
      :max-size="50 * 1024 * 1024"
      :loading="uploadPending"
      :upload-progress="aggregateUploadProgress"
      :file-progress="fileUploadProgressByIndex"
      @upload="handleFileUpload"
    >
      <template #header-content>
        <div class="mb-4">
          <label class="block text-sm font-medium text-[var(--text-secondary)] mb-2">
            Storage Location
          </label>
          <USelectMenu
            v-model="selectedStorage"
            :items="storageOptions"
            placeholder="Select storage (optional)"
            size="lg"
            :loading="storageConfigsPending"
            :disabled="storageConfigsPending"
            class="w-full"
          />
          <UAlert
            v-if="storageConfigsError"
            color="error"
            variant="soft"
            icon="lucide:triangle-alert"
            title="Storage locations could not be loaded"
            :description="storageConfigsError.message"
            :actions="[{
              label: 'Retry',
              color: 'error',
              variant: 'soft',
              onClick: () => fetchStorageConfigs()
            }]"
            class="mt-3"
          />
        </div>
      </template>
    </CommonUploadModal>

    <FolderCreateModal
      v-model="showCreateModal"
      @created="handleFolderCreated"
    />
  </div>
</template>
