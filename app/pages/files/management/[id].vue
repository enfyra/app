<script setup lang="ts">
// useApi is auto-imported in Nuxt
const route = useRoute();
const router = useRouter();
const showCreateModal = ref(false);
const showUploadModal = ref(false);

// Pagination state
const folderPage = ref(Number(route.query.folderPage) || 1);
const filePage = ref(Number(route.query.filePage) || 1);
const pageLimit = 20; // Show 20 items per page
const { registerPageHeader } = usePageHeaderRegistry();

const {
  data: folder,
  pending: folderPending,
  execute: fetchFolder,
} = useApi(() => `/folder_definition`, {
  query: computed(() => ({
    filter: {
      id: {
        _eq: route.params.id,
      },
    },
    deep: {
      children: {
        fields: "*",
        limit: pageLimit,
        page: folderPage.value,
        meta: "*",
        sort: "-order,-createdAt",
      },
      files: {
        fields: "*",
        limit: pageLimit,
        page: filePage.value,
        meta: "*",
        sort: "-createdAt",
      },
    },
  })),
  errorContext: "Load Folder Info",
});

// Register page header with dynamic folder name
watch(() => folder.value?.data?.[0]?.name, (name) => {
  if (name) {
    registerPageHeader({
      title: `${name} - Files Manager`,
      description: "Manage files and subfolders in this directory",
      gradient: "cyan",
    });
  }
}, { immediate: true });

// Prepare folders data from deep query
const folders = computed(() => folder.value?.data?.[0]?.children || []);
const folderTotal = computed(() => {
  // Get meta from deep query children
  const childrenMeta = folder.value?.meta?.children?.[0];
  return childrenMeta?.filterCount || 0;
});

// Prepare files data from deep query
const files = computed(() => folder.value?.data?.[0]?.files || []);
const fileTotal = computed(() => {
  // Get meta from deep query files
  const filesMeta = folder.value?.meta?.files?.[0];
  return filesMeta?.filterCount || 0;
});

// Loading states - use folderPending for both since it's one API
const childFoldersPending = computed(() => folderPending.value);
const filesPending = computed(() => folderPending.value);

// Upload files API
const {
  execute: uploadFilesApi,
  error: uploadError,
  pending: uploadPending,
} = useApi(() => `file_definition`, {
  method: "post",
  errorContext: "Upload Files",
});

// Page title computation
const pageTitle = computed(() => {
  if (folderPending.value) return "Loading...";
  return `${folder.value?.data?.[0]?.name || "Unknown Folder"} - Files Manager`;
});

// Stats for PageHeader
const pageStats = computed(() => {
  const totalChildFolders = folderTotal.value;
  const totalChildFiles = fileTotal.value;

  return [
    {
      icon: "lucide:folder",
      iconColor: "text-primary",
      iconBg: "bg-primary/10",
      value: totalChildFolders,
      label: "Child Folders",
    },
    {
      icon: "lucide:file",
      iconColor: "text-blue-600 dark:text-blue-400",
      iconBg: "bg-blue-100 dark:bg-blue-900/30",
      value: totalChildFiles,
      label: "Child Files",
    },
  ];
});

// Handle refresh
async function handleRefreshItems() {
  await fetchFolder();

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

function handleFolderCreated() {
  folderPage.value = 1;
  filePage.value = 1;
  fetchFolder();
}

// Handle file upload
async function handleFileUpload(files: File | File[]) {
  const fileArray = Array.isArray(files) ? files : [files];

  // Create array of FormData objects for batch upload
  const formDataArray = fileArray.map((file) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", route.params.id as string); // folderId for files in this folder
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

  await fetchFolder();

  showUploadModal.value = false;

  useToast().add({
    title: "Success",
    description: `${fileArray.length} file(s) uploaded successfully`,
    color: "success",
  });
}

// Combined watcher for both pagination parameters
watch(
  [() => route.query.folderPage, () => route.query.filePage],
  async ([newFolderPage, newFilePage]) => {
    folderPage.value = newFolderPage ? Number(newFolderPage) : 1;
    filePage.value = newFilePage ? Number(newFilePage) : 1;
    await fetchFolder();
  },
  { immediate: true }
);

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
    <!-- Content -->
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
      @refresh-folders="fetchFolder"
      @refresh-files="fetchFolder"
      @create-folder="showCreateModal = true"
    />

    <!-- Pagination -->
    <div
      class="flex justify-center gap-4 mt-6"
      v-if="!childFoldersPending && !filesPending"
    >
      <!-- Folder Pagination -->
      <div v-if="folderTotal > pageLimit" class="flex items-center gap-2">
        <span class="text-sm text-gray-600 dark:text-gray-400">Folders:</span>
        <UPagination
          v-model:page="folderPage"
          :items-per-page="pageLimit"
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
      <div v-if="fileTotal > pageLimit" class="flex items-center gap-2">
        <span class="text-sm text-gray-600 dark:text-gray-400">Files:</span>
        <UPagination
          v-model:page="filePage"
          :items-per-page="pageLimit"
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
      :parent-id="route.params.id as string"
    />

    <!-- Detail Modals -->
    <FolderDetailModal />
  </div>
</template>
