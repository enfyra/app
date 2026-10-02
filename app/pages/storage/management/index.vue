<script setup lang="ts">
import { useFileManagerUpload } from '~/composables/file-manager/useFileManagerUpload';
const fileActionsActive = ref(false);
const showCreateModal = ref(false);
const route = useRoute();
const router = useRouter();
const { getIdFieldName } = useDatabase();
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

const folders = computed(() => rootFolders.value?.data || []);
const folderTotal = computed(() => rootFolders.value?.meta?.filterCount || 0);

const files = computed(() => rootFiles.value?.data || []);
const fileTotal = computed(() => rootFiles.value?.meta?.filterCount || 0);

const {
  showUploadModal, selectedStorage, storageOptions, storageConfigsPending,
  storageConfigsError, fetchStorageConfigs, aggregateUploadProgress,
  fileUploadProgressByIndex, uploadPending, handleFileUpload,
} = useFileManagerUpload({ onUploaded: fetchRootFiles });

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

async function handleFolderCreated() {
  if (route.query.folderPage !== undefined) {
    const query = { ...route.query };
    delete query.folderPage;
    await router.replace({ query });
  } else {
    await fetchRootFolders();
  }
}

async function handleRefreshItems() {
  await Promise.all([fetchRootFolders(), fetchRootFiles()]);

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

const { registerPageHeader } = usePageHeaderRegistry();

registerPageHeader({
  title: "File Manager",
  description: "Organize your files and documents efficiently",
  gradient: "cyan",
});
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
      @create-file="showUploadModal = true"
      @context-change="fileActionsActive = $event"
    />

    <div
      v-if="folderTotal > limit || fileTotal > limit"
      class="mt-6 space-y-4"
    >
      <div v-if="folderTotal > limit">
        <p class="mb-2 text-xs font-medium text-[var(--text-tertiary)]">Folders</p>
        <CommonPaginationBar
          v-model:page="folderPage"
          :items-per-page="limit"
          :total="folderTotal"
          :loading="rootPending"
          :floating="!fileActionsActive"
          :to="(p) => ({ path: route.path, query: { ...route.query, folderPage: p } })"
        />
      </div>

      <div v-if="fileTotal > limit">
        <p class="mb-2 text-xs font-medium text-[var(--text-tertiary)]">Files</p>
        <CommonPaginationBar
          v-model:page="filePage"
          :items-per-page="limit"
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
    />
  </div>
</template>
