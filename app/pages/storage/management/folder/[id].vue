<script setup lang="ts">
import { useFileManagerUpload } from '~/composables/file-manager/useFileManagerUpload';
const route = useRoute();
const router = useRouter();
const fileActionsActive = ref(false);
const showCreateModal = ref(false);
const { getIdFieldName } = useDatabase();

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

const {
  showUploadModal, selectedStorage, storageOptions, storageConfigsPending,
  storageConfigsError, fetchStorageConfigs, aggregateUploadProgress,
  fileUploadProgressByIndex, uploadPending, handleFileUpload,
} = useFileManagerUpload({ folderId: () => route.params.id as string, onUploaded: fetchFiles });

async function handleRefreshItems() {
  await Promise.all([fetchChildFolders(), fetchFiles()]);

  const newQuery = { ...route.query };
  let changed = false;

  if (folders.value.length === 0 && folderPage.value > 1) {
    delete newQuery.folderPage;
    changed = true;
  }

  if (files.value.length === 0 && filePage.value > 1) {
    delete newQuery.filePage;
    changed = true;
  }

  if (changed) {
    await router.replace({ query: newQuery });
  }
}

async function handleFolderCreated() {
  if (route.query.folderPage !== undefined) {
    const query = { ...route.query };
    delete query.folderPage;
    await router.replace({ query });
  } else {
    await fetchChildFolders();
  }
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
      @create-file="showUploadModal = true"
      @context-change="fileActionsActive = $event"
    />

    <div
      v-if="folderTotal > pageLimit || fileTotal > pageLimit"
      class="mt-6 space-y-4"
    >
      <div v-if="folderTotal > pageLimit">
        <p class="mb-2 text-xs font-medium text-[var(--text-tertiary)]">Folders</p>
        <CommonPaginationBar
          v-model:page="folderPage"
          :items-per-page="pageLimit"
          :total="folderTotal"
          :loading="childFoldersPending"
          :floating="!fileActionsActive"
          :to="(p) => ({ path: route.path, query: { ...route.query, folderPage: p } })"
        />
      </div>

      <div v-if="fileTotal > pageLimit">
        <p class="mb-2 text-xs font-medium text-[var(--text-tertiary)]">Files</p>
        <CommonPaginationBar
          v-model:page="filePage"
          :items-per-page="pageLimit"
          :total="fileTotal"
          :loading="filesPending"
          :floating="!fileActionsActive"
          :to="(p) => ({ path: route.path, query: { ...route.query, filePage: p } })"
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
