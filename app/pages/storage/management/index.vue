<script setup lang="ts">
const showCreateModal = ref(false);
const showUploadModal = ref(false);
const selectedStorage = ref<{ label: string; value: string; icon: string }>();

const route = useRoute();
const { storageConfigs } = useGlobalState();
const router = useRouter();
const { getId } = useDatabase();
const folderPage = ref(Number(route.query.folderPage) || 1);
const filePage = ref(Number(route.query.filePage) || 1);
const limit = 20;

const { getIncludeFields: getFileFields } = useSchema("file_definition");

const {
  data: rootFolders,
  pending: rootPending,
  execute: fetchRootFolders,
} = useApi(() => `folder_definition`, {
  query: computed(() => ({
    limit,
    page: folderPage.value,
    meta: "*",
    sort: "-order,-createdAt",
    filter: {
      parent: {
        id: {
          _is_null: true,
        },
      },
    },
  })),
  errorContext: "Load Root Folders",
});

const {
  data: rootFiles,
  pending: filesPending,
  execute: fetchRootFiles,
} = useApi(() => `file_definition`, {
  query: computed(() => ({
    fields: getFileFields(),
    limit,
    page: filePage.value,
    meta: "*",
    sort: "-createdAt",
    filter: {
      folder: {
        id: {
          _is_null: true,
        },
      },
    },
  })),
  errorContext: "Load Root Files",
});

const {
  execute: uploadFilesApi,
  error: uploadError,
  pending: uploadPending,
} = useApi(() => `file_definition`, {
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
      label: config.name,
      value: getId(config),
      icon: isCloudStorage ? 'lucide:cloud' : 'lucide:hard-drive',
    };
  });
});

const pageStats = computed(() => {
  const totalFolders = rootFolders.value?.meta?.filterCount || 0;
  const totalFiles = rootFiles.value?.meta?.filterCount || 0;

  return [
    {
      icon: "lucide:folder",
      iconColor: "text-primary",
      iconBg: "bg-primary/10",
      value: totalFolders,
      label: "Root Folders",
    },
    {
      icon: "lucide:file",
      iconColor: "text-blue-600 dark:text-blue-400",
      iconBg: "bg-blue-100 dark:bg-blue-900/30",
      value: totalFiles,
      label: "Root Files",
    },
  ];
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

  const formDataArray = fileArray.map((file) => {
    const formData = new FormData();
    formData.append("file", file);
    if (selectedStorage.value) {
      formData.append("storageConfig", selectedStorage.value.value);
    }
    return formData;
  });

  await uploadFilesApi({
    files: formDataArray,
  });

  if (uploadError.value) {
    return;
  }

  await fetchRootFiles();

  showUploadModal.value = false;
  selectedStorage.value = undefined;

  useToast().add({
    title: "Success",
    description: `${fileArray.length} file(s) uploaded successfully`,
    color: "success",
  });
}

const { registerPageHeader } = usePageHeaderRegistry();

registerPageHeader({
  title: "Files Manager",
  description: "Organize your files and documents efficiently",
  gradient: "cyan",
});

useHeaderActionRegistry([
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
          route: "/file_definition",
          actions: ["create"],
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
          route: "/folder_definition",
          actions: ["create"],
        },
      ],
    },
  },
]);
</script>

<template>
  <div class="space-y-8">
    <!-- Integrated File Manager -->
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

    <!-- Pagination -->
    <div
      class="flex justify-center gap-4 mt-6"
      v-if="!rootPending && !filesPending"
    >
      <!-- Folder Pagination -->
      <div v-if="folderTotal > limit" class="flex items-center gap-2">
        <span class="text-sm text-gray-600 dark:text-gray-400">Folders:</span>
        <UPagination
          v-model:page="folderPage"
          :items-per-page="limit"
          :total="folderTotal"
          show-edges
          :sibling-count="1"
          :to="
            (p) => ({
              path: route.path,
              query: { ...route.query, folderPage: p },
            })
          "
          color="secondary"
          active-color="secondary"
        />
      </div>

      <!-- File Pagination -->
      <div v-if="fileTotal > limit" class="flex items-center gap-2">
        <span class="text-sm text-gray-600 dark:text-gray-400">Files:</span>
        <UPagination
          v-model:page="filePage"
          :items-per-page="limit"
          :total="fileTotal"
          show-edges
          :sibling-count="1"
          :to="
            (p) => ({
              path: route.path,
              query: { ...route.query, filePage: p },
            })
          "
          color="secondary"
          active-color="secondary"
        />
      </div>
    </div>

    <!-- Upload Modal -->
    <CommonUploadModal
      v-model="showUploadModal"
      title="Upload Files"
      :multiple="true"
      accept="*/*"
      :max-size="50 * 1024 * 1024"
      :loading="uploadPending"
      @upload="handleFileUpload"
    >
      <template #header-content>
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Storage Location
          </label>
          <USelectMenu
            v-model="selectedStorage"
            :items="storageOptions"
            placeholder="Select storage (optional)"
            size="lg"
            class="w-full"
          />
        </div>
      </template>
    </CommonUploadModal>

    <!-- Create Folder Modal -->
    <FolderCreateModal
      v-model="showCreateModal"
      @created="handleFolderCreated"
    />
  </div>
</template>
