<script setup lang="ts">
const { register: registerHeaderActions } = useHeaderActionRegistry();
const route = useRoute();
const router = useRouter();
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

const {
  storageConfigs,
  storageConfigsFetched,
  storageConfigsPending,
  storageConfigsError,
  fetchStorageConfigs
} = useGlobalState();
const { getId, getIdFieldName } = useDatabase();

const folderPage = ref(Number(route.query.folderPage) || 1);
const filePage = ref(Number(route.query.filePage) || 1);
const pageLimit = 20;
const { registerPageHeader } = usePageHeaderRegistry();

const { getIncludeFields: getFileFields } = useSchema("enfyra_file");

const {
  data: folder,
  execute: fetchFolder,
} = useApi(() => `/enfyra_folder`, {
  query: computed(() => {
    const idField = getIdFieldName();
    return {
    filter: {
        [idField]: {
        _eq: route.params.id,
      },
    },
    };
  }),
  errorContext: "Load Folder Info",
});

const {
  data: childFolders,
  pending: childFoldersPending,
  execute: fetchChildFolders,
} = useApi(() => `/enfyra_folder`, {
  query: computed(() => {
    const idField = getIdFieldName();
    return {
    limit: pageLimit,
    page: folderPage.value,
    meta: "*",
    sort: "-order,-createdAt",
    filter: {
      parent: {
          [idField]: {
          _eq: route.params.id,
        },
      },
    },
    };
  }),
  errorContext: "Load Child Folders",
});

const {
  data: folderFiles,
  pending: filesPending,
  execute: fetchFiles,
} = useApi(() => `/enfyra_file`, {
  query: computed(() => {
    const idField = getIdFieldName();
    return {
    fields: getFileFields(),
    limit: pageLimit,
    page: filePage.value,
    meta: "*",
    sort: "-createdAt",
    filter: {
      folder: {
          [idField]: {
          _eq: route.params.id,
        },
      },
    },
    };
  }),
  errorContext: "Load Files",
});

watch(() => folder.value?.data?.[0]?.name, (name) => {
  if (name) {
    registerPageHeader({
      title: `${name} - Files Manager`,
      description: "Manage files and subfolders in this directory",
      gradient: "cyan",
    });
  }
}, { immediate: true });

const folders = computed(() => childFolders.value?.data || []);
const folderTotal = computed(() => childFolders.value?.meta?.filterCount || 0);

const files = computed(() => folderFiles.value?.data || []);
const fileTotal = computed(() => folderFiles.value?.meta?.filterCount || 0);

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

const {
  execute: uploadFilesApi,
  error: uploadError,
  pending: uploadPending,
} = useApi(() => `enfyra_file`, {
  method: "post",
  errorContext: "Upload Files",
});

async function handleRefreshItems() {
  await Promise.all([fetchChildFolders(), fetchFiles()]);

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

function handleFolderCreated() {
  folderPage.value = 1;
  filePage.value = 1;
  fetchChildFolders();
  fetchFiles();
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
    formData.append("folder", route.params.id as string);
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

  await fetchFiles();

  showUploadModal.value = false;
  selectedStorage.value = undefined;
  fileUploadProgressByIndex.value = {};
  uploadFileSizes.value = [];
  resetUploadProgress();

  useNotify().success("Success", `${fileArray.length} file(s) uploaded successfully`);
}

watch(
  () => route.query.folderPage,
  async (newPage) => {
    folderPage.value = Number(newPage) || 1;
    await fetchChildFolders();
  }
);

watch(
  () => route.query.filePage,
  async (newPage) => {
    filePage.value = Number(newPage) || 1;
    await fetchFiles();
  }
);

watch(
  () => route.params.id,
  async () => {
    folderPage.value = Number(route.query.folderPage) || 1;
    filePage.value = Number(route.query.filePage) || 1;

    await Promise.all([
      fetchFolder(),
      fetchChildFolders(),
      fetchFiles()
    ]);
  },
  { immediate: true }
);

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
      :parent-id="route.params.id as string"
      :folders="folders"
      :files="files"
      :folders-loading="childFoldersPending"
      :files-loading="filesPending"
      empty-title="No items found"
      empty-description="This folder doesn't contain any files or subfolders"
      :show-create-button="true"
      @refresh-items="handleRefreshItems"
      @refresh-folders="fetchChildFolders"
      @refresh-files="fetchFiles"
      @create-folder="showCreateModal = true"
    />

    <div
      v-if="folderTotal > pageLimit || fileTotal > pageLimit"
      class="mt-6 flex flex-col justify-center gap-4 lg:flex-row"
    >
      <div v-if="folderTotal > pageLimit" class="flex items-center gap-2">
        <span class="text-sm text-[var(--text-tertiary)]">Folders:</span>
        <CommonPaginationBar
          v-model:page="folderPage"
          align="center"
          :items-per-page="pageLimit"
          :total="folderTotal"
          :loading="childFoldersPending"
          :show-range="false"
          :to="(p) => ({ path: route.path, query: { ...route.query, folderPage: p } })"
          color="secondary"
          active-color="secondary"
        />
      </div>

      <div v-if="fileTotal > pageLimit" class="flex items-center gap-2">
        <span class="text-sm text-[var(--text-tertiary)]">Files:</span>
        <CommonPaginationBar
          v-model:page="filePage"
          align="center"
          :items-per-page="pageLimit"
          :total="fileTotal"
          :loading="filesPending"
          :show-range="false"
          :to="(p) => ({ path: route.path, query: { ...route.query, filePage: p } })"
          color="secondary"
          active-color="secondary"
        />
      </div>
    </div>

    <LazyCommonUploadModal
      v-if="showUploadModal"
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
    </LazyCommonUploadModal>

    <FolderCreateModal
      v-model="showCreateModal"
      @created="handleFolderCreated"
      :parent-id="route.params.id as string"
    />
  </div>
</template>
