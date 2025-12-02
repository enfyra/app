<script setup lang="ts">
interface Props {
  parentId?: string;
  folders?: any[];
  files?: any[];
  foldersLoading?: boolean;
  filesLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  showCreateButton?: boolean;
}

interface Emits {
  refreshItems: [];
  refreshFolders: [];
  refreshFiles: [];
  createFolder: [];
  createFile: [];
}

const props = withDefaults(defineProps<Props>(), {
  foldersLoading: false,
  filesLoading: false,
  folders: () => [],
  files: () => [],
  emptyTitle: "No items yet",
  emptyDescription:
    "This folder is empty. Create folders or upload files to get started.",
  showCreateButton: true,
  parentId: undefined,
});

const emit = defineEmits<Emits>();

const { viewMode, toggleViewMode } = useFileManagerViewMode();
const { isSelectionMode, selectedItems, toggleItemSelection, clearSelection } =
  useFileManagerSelection();
const {
  isMoveMode,
  isAnyMovePending,
  moveState,
  startMoveMode,
  cancelMoveMode,
  isMoveHereDisabled,
  handleMoveHere,
  clearFileManagerState,
} = useFileManagerMove();
const { deleteSelectedFolders, deleteSelectedFiles } = useFileManager();
const { confirm } = useConfirm();
const { getId } = useDatabase();

function handleFolderClick(folder: any) {
  if (
    moveState.value.moveMode &&
    (moveState.value.selectedFolderIds || []).includes(getId(folder))
  ) {
    const toast = useToast();
    toast.add({
      title: "Cannot navigate",
      description: "You cannot move a folder into itself.",
      color: "warning",
    });
    return;
  }
  navigateTo(`/storage/management/folder/${getId(folder)}`);
}

function handleFileClick(file: any) {
  if (moveState.value.moveMode) {
    const toast = useToast();
    toast.add({
      title: "Cannot open file",
      description: "Cancel move mode to access files.",
      color: "info",
    });
    return;
  }

  navigateTo(`/storage/management/file/${getId(file)}`);
}

function handleToggleItemSelection(itemId: string) {
  toggleItemSelection(itemId);

  if (
    selectedItems.value.length > 0 &&
    !isSelectionMode.value &&
    !isMoveMode.value &&
    viewMode.value === "grid"
  ) {
    isSelectionMode.value = true;
  }
}

onMounted(() => {
  if (moveState.value.moveMode && moveState.value.selectedItems.length > 0) {
    selectedItems.value = [...moveState.value.selectedItems];
    isSelectionMode.value = false;
  }
});

function clearAllState() {
  clearFileManagerState();
  clearSelection();
}

function handleStartMoveMode() {
  startMoveMode(
    selectedItems.value,
    props.folders,
    props.files,
    props.parentId
  );
  isSelectionMode.value = false;
}

function handleCancelMoveMode() {
  const clearedSelection = cancelMoveMode();
  selectedItems.value = clearedSelection;
}

async function handleMoveHereWrapper() {
  const success = await handleMoveHere(props.parentId, () =>
    emit("refreshItems")
  );
  if (success) {
    clearSelection();
    handleCancelMoveMode();
  }
}

onBeforeRouteLeave((to, from) => {
  if (
    from.path.includes("/storage/management") &&
    !to.path.includes("/storage/management")
  ) {
    clearAllState();
  }
});

async function handleBulkDelete() {
  if (selectedItems.value.length === 0) return;

  const folderIds = selectedItems.value.filter((id) =>
    props.folders.find((folder) => folder.id === id)
  );
  const fileIds = selectedItems.value.filter((id) =>
    props.files.find((file) => file.id === id)
  );

  const folderList = folderIds.map((id) => props.folders.find((f) => f.id === id)).filter(Boolean);

  if (folderIds.length > 0) {
    await deleteSelectedFolders(folderList, () => emit("refreshItems"));
  }

  if (fileIds.length > 0) {
    await deleteSelectedFiles(fileIds, () => emit("refreshItems"));
  }

    selectedItems.value = [];
    isSelectionMode.value = false;
}

useSubHeaderActionRegistry([
  {
    id: "page-view-mode",
    label: computed(() =>
      viewMode.value === "grid" ? "List View" : "Grid View"
    ),
    icon: computed(() =>
      viewMode.value === "grid" ? "lucide:layout-list" : "lucide:layout-grid"
    ),
    onClick: toggleViewMode,
    side: "left",
  },
  {
    id: "toggle-selection",
    label: computed(() =>
      isSelectionMode.value ? "Cancel Selection" : "Select Items"
    ),
    icon: computed(() =>
      isSelectionMode.value ? "lucide:x" : "lucide:check-square"
    ),
    variant: computed(() => (isSelectionMode.value ? "ghost" : "outline")),
    color: computed(() => (isSelectionMode.value ? "secondary" : "primary")),
    onClick: () => {
      isSelectionMode.value = !isSelectionMode.value;
      if (!isSelectionMode.value) {
        clearSelection();
      }
    },
    side: "right",
    show: computed(() => !isMoveMode.value),
    permission: {
      and: [
        {
          route: "/folder_definition",
          actions: ["delete"],
        },
        {
          route: "/file_definition",
          actions: ["delete"],
        },
      ],
    },
  },
  {
    id: "bulk-delete",
    label: "Delete Selected",
    icon: "lucide:trash-2",
    variant: "solid",
    color: "error",
    onClick: handleBulkDelete,
    side: "right",
    show: computed(() => selectedItems.value.length > 0 && !isMoveMode.value),
  },
  {
    id: "start-move",
    label: "Move",
    icon: "lucide:arrow-right-left",
    variant: "solid",
    color: "info",
    onClick: handleStartMoveMode,
    side: "right",
    show: computed(() => selectedItems.value.length > 0 && !isMoveMode.value),
  },
  {
    id: "move-here",
    label: computed(() => {
      const files = moveState.value.selectedFileIds?.length || 0;
      const folders = moveState.value.selectedFolderIds?.length || 0;
      const countLabel =
        files + folders > 0 ? ` (${files} files, ${folders} folders)` : "";
      return (isAnyMovePending.value ? "Moving..." : "Move here") + countLabel;
    }),
    icon: "lucide:folder-input",
    variant: "solid",
    color: "primary",
    loading: computed(() => isAnyMovePending.value),
    disabled: computed(
      () => isMoveHereDisabled(props.parentId) || isAnyMovePending.value
    ),
    onClick: handleMoveHereWrapper,
    side: "right",
    show: computed(() => isMoveMode.value),
  },
  {
    id: "cancel-move",
    label: "Cancel",
    icon: "lucide:x",
    variant: "ghost",
    color: "secondary",
    onClick: handleCancelMoveMode,
    side: "right",
    show: computed(() => isMoveMode.value),
  },
  {
    id: "select-all",
    label: computed(() => {
      const totalCount =
        (props.folders?.length || 0) + (props.files?.length || 0);
      const selectedCount = selectedItems.value.length;
      return selectedCount === totalCount ? "Deselect All" : "Select All";
    }),
    icon: computed(() => {
      const totalCount =
        (props.folders?.length || 0) + (props.files?.length || 0);
      return selectedItems.value.length === totalCount
        ? "lucide:square"
        : "lucide:check-square";
    }),
    color: computed(() => {
      const totalCount =
        (props.folders?.length || 0) + (props.files?.length || 0);
      return selectedItems.value.length === totalCount ? "warning" : "primary";
    }),
    onClick: () => {
      const totalCount =
        (props.folders?.length || 0) + (props.files?.length || 0);

      if (selectedItems.value.length === totalCount) {
        selectedItems.value = [];
      } else {
        const allItems = [...props.folders, ...props.files];
        selectedItems.value = allItems.map((item) => item.id);
      }
    },
    side: "right",
    show: computed(() => isSelectionMode.value),
  },
]);
</script>

<template>
  <div class="space-y-6">
    <!-- Content -->
    <div class="min-h-[400px] space-y-8">
      <div class="space-y-8">
        <!-- Folders Section -->
        <div class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] shadow-theme-md overflow-hidden">
          <div class="px-5 py-4 border-b border-gray-200 dark:border-gray-800">
            <h2 class="text-lg font-semibold text-gray-800 dark:text-white/90">
              Folders
            </h2>
          </div>

          <div class="p-5">
            <FolderView
              :folders="props.folders"
              :view-mode="viewMode"
              :loading="props.foldersLoading && props.folders.length === 0"
              empty-title="No folders"
              empty-description="No folders in this location"
              :is-selection-mode="isSelectionMode"
              :selected-items="selectedItems"
              @folder-click="handleFolderClick"
              @toggle-selection="handleToggleItemSelection"
              @refresh-folders="() => emit('refreshFolders')"
            />
          </div>
        </div>

        <!-- Files Section -->
        <div class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] shadow-theme-md overflow-hidden">
          <div class="px-5 py-4 border-b border-gray-200 dark:border-gray-800">
            <h2 class="text-lg font-semibold text-gray-800 dark:text-white/90">
              Files
            </h2>
          </div>

          <div class="p-5">
            <FileView
              :files="props.files"
              :view-mode="viewMode"
              :loading="props.filesLoading && props.files.length === 0"
              empty-title="No files"
              empty-description="No files in this location"
              :is-selection-mode="isSelectionMode"
              :selected-items="selectedItems"
              @file-click="handleFileClick"
              @toggle-selection="handleToggleItemSelection"
              @refresh-files="() => emit('refreshFiles')"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
