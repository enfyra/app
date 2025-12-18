<script setup lang="ts">
const route = useRoute();
const router = useRouter();
const showCreateModal = ref(false);
const showUploadModal = ref(false);
const selectedStorage = ref<{ label: string; value: string; icon: string }>();

const { storageConfigs } = useGlobalState();
const { getId, getIdFieldName } = useDatabase();

const folderPage = ref(Number(route.query.folderPage) || 1);
const filePage = ref(Number(route.query.filePage) || 1);
const pageLimit = 20;
const { registerPageHeader } = usePageHeaderRegistry();

const { getIncludeFields: getFileFields } = useSchema("file_definition");

const {
  data: folder,
  pending: folderPending,
  execute: fetchFolder,
} = useApi(() => `/folder_definition`, {
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
} = useApi(() => `/folder_definition`, {
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
} = useApi(() => `/file_definition`, {
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
      label: config.name,
      value: getId(config),
      icon: isCloudStorage ? 'lucide:cloud' : 'lucide:hard-drive',
    };
  });
});

const {
  execute: uploadFilesApi,
  error: uploadError,
  pending: uploadPending,
} = useApi(() => `file_definition`, {
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

  const formDataArray = fileArray.map((file) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", route.params.id as string);
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

  await fetchFiles();

  showUploadModal.value = false;
  selectedStorage.value = undefined;

  useToast().add({
    title: "Success",
    description: `${fileArray.length} file(s) uploaded successfully`,
    color: "success",
  });
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
      class="flex justify-center gap-4 mt-6"
      v-if="!childFoldersPending && !filesPending"
    >
      
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

    <FolderCreateModal
      v-model="showCreateModal"
      @created="handleFolderCreated"
      :parent-id="route.params.id as string"
    />
  </div>
</template>
