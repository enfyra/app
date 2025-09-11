<script setup lang="ts">
// useApi is auto-imported in Nuxt
const showCreateModal = ref(false);
const showUploadModal = ref(false);

// Pagination state
const route = useRoute();
const router = useRouter();
const folderPage = ref(Number(route.query.folderPage) || 1);
const filePage = ref(Number(route.query.filePage) || 1);
const limit = 20;
// Get root folders (folders without parent)
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

// Upload files API
const {
  execute: uploadFilesApi,
  error: uploadError,
  pending: uploadPending,
} = useApi(() => `file_definition`, {
  method: "post",
  errorContext: "Upload Files",
});

// Prepare folders data
const folders = computed(() => rootFolders.value?.data || []);
const folderTotal = computed(() => rootFolders.value?.meta?.filterCount || 0);

// Prepare files data
const files = computed(() => rootFiles.value?.data || []);
const fileTotal = computed(() => rootFiles.value?.meta?.filterCount || 0);

// Stats for PageHeader
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

// Handle folder created - refresh both folders and files
function handleFolderCreated() {
  fetchRootFolders();
  fetchRootFiles();
}

// Handle refresh items
async function handleRefreshItems() {
  await Promise.all([fetchRootFolders(), fetchRootFiles()]);

  let newQuery = { ...route.query };

  // Check folders independently
  if (folders.value.length === 0 && folderPage.value > 1) {
    folderPage.value = 1;
    delete newQuery.folderPage;
  }

  // Check files independently
  if (files.value.length === 0 && filePage.value > 1) {
    filePage.value = 1;
    delete newQuery.filePage;
  }

  // Update URL if any pagination changed
  // Watchers will handle the refetch automatically
  if (newQuery !== route.query) {
    await router.replace({ query: newQuery });
  }
}

// Handle file upload
async function handleFileUpload(files: File | File[]) {
  const fileArray = Array.isArray(files) ? files : [files];

  // Create array of FormData objects for batch upload
  const formDataArray = fileArray.map((file) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", "null"); // null for root files
    return formData;
  });

  // Upload to /file_definition with batch support
  await uploadFilesApi({
    files: formDataArray,
  });

  // Check for errors
  if (uploadError.value) {
    return; // Error already handled by useApi
  }

  // Refresh files list after successful upload
  await fetchRootFiles();

  // Close modal
  showUploadModal.value = false;

  // Show success message
  useToast().add({
    title: "Success",
    description: `${fileArray.length} file(s) uploaded successfully`,
    color: "success",
  });
}

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
    <!-- Page Header -->
    <CommonPageHeader
      title="Files Manager"
      description="Organize your files and documents efficiently"
      :stats="pageStats"
      title-size="md"
      show-background
      background-gradient="from-blue-500/8 via-cyan-400/5 to-transparent"
      padding-y="py-6"
    />

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
    />

    <!-- Create Folder Modal -->
    <FolderCreateModal
      v-model="showCreateModal"
      @created="handleFolderCreated"
    />

    <!-- Detail Modals -->
    <FolderDetailModal />
  </div>
</template>
