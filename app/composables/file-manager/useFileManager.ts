
export function useFileManager(parentFilter?: any) {
  // API call for folders (only if parentFilter is provided)
  const apiCall = parentFilter
    ? useEnfyraApi(() => "folder_definition", {
        query: computed(() => ({
          limit: 100,
          fields: "*",
          sort: "order,name",
          filter: parentFilter,
        })),
      })
    : { data: ref(null), pending: ref(false), execute: () => {} };

  const { data: folders, pending, execute: refreshFolders } = apiCall;

  const toast = useToast();
  const { confirm } = useConfirm();

  // API calls at setup level (following best practices)
  const { execute: deleteFolderApi, error: deleteFolderError } = useEnfyraApi(
    () => "/folder_definition",
    {
      method: "delete",
      errorContext: "Delete Folder",
    }
  );

  const { execute: deleteFileApi, error: deleteFileError } = useEnfyraApi(
    () => "/file_definition",
    {
      method: "delete",
      errorContext: "Delete File",
    }
  );

  // Use useState for global state sharing across components
  const showDetailModal = useState("folder-detail-modal", () => false);
  const selectedFolder = useState<any>("folder-selected", () => null);

  // Multi-select state
  const selectedFolders = useState<string[]>("folder-selected-list", () => []);
  const isSelectionMode = useState("folder-selection-mode", () => false);

  // Multi-select functions
  function toggleFolderSelection(folderId: string) {
    const index = selectedFolders.value.indexOf(folderId);
    if (index > -1) {
      selectedFolders.value.splice(index, 1);
    } else {
      selectedFolders.value.push(folderId);
    }
  }

  function toggleSelectionMode() {
    isSelectionMode.value = !isSelectionMode.value;

    if (!isSelectionMode.value) {
      selectedFolders.value = [];
    }
  }

  function toggleSelectAll(totalCount: number = 0, folderList?: any[]) {
    if (selectedFolders.value.length === totalCount) {
      // All selected, deselect all
      selectedFolders.value = [];
    } else {
      // Not all selected, select all
      selectedFolders.value = [];
      const foldersToUse = folderList || folders.value?.data || [];
      foldersToUse.forEach((folder: any) => {
        selectedFolders.value.push(folder.id);
      });
    }
  }

  function showFolderDetail(folder: any) {
    selectedFolder.value = folder;
    showDetailModal.value = true;
  }

  function getContextMenuItems(folder: any, refreshCallback?: () => void) {
    return [
      [
        {
          label: "Details",
          icon: "i-lucide-info",
          onSelect: () => showFolderDetail(folder),
        },
      ],
      [
        {
          label: "Delete",
          icon: "i-lucide-trash",
          color: "error" as const,
          onSelect: () => deleteFolder(folder, refreshCallback),
        },
      ],
    ];
  }

  async function deleteFolder(folder: any, refreshCallback?: () => void) {
    const isConfirmed = await confirm({
      title: "Delete Folder",
      content: `Are you sure you want to delete folder "${folder.name}"? This action cannot be undone.`,
      confirmText: "Delete",
      cancelText: "Cancel",
    });

    if (isConfirmed) {
      await deleteFolderApi({ id: folder.id });

      if (deleteFolderError.value) {
        return;
      }

      // Call refresh callback if provided, otherwise use internal one
      if (refreshCallback) {
        refreshCallback();
      } else if (refreshFolders) {
        await refreshFolders();
      }

      toast.add({
        title: "Success",
        description: `Folder "${folder.name}" has been deleted successfully!`,
        color: "success",
      });
    }
  }

  async function deleteSelectedFolders(
    folderList?: any[],
    refreshCallback?: () => void
  ) {
    if (selectedFolders.value.length === 0) return;

    const currentFolders = folderList || folders.value?.data || [];
    const folderNames = selectedFolders.value
      .map((id) => currentFolders.find((f: any) => f.id === id)?.name)
      .filter(Boolean);

    const isConfirmed = await confirm({
      title: "Delete Multiple Folders",
      content: `Are you sure you want to delete ${
        selectedFolders.value.length
      } folder(s)? This includes: ${folderNames.slice(0, 3).join(", ")}${
        folderNames.length > 3 ? ` and ${folderNames.length - 3} more` : ""
      }. This action cannot be undone.`,
      confirmText: "Delete",
      cancelText: "Cancel",
    });

    if (isConfirmed) {
      // Use batch operations as per docs recommendation
      await deleteFolderApi({ ids: selectedFolders.value });

      if (deleteFolderError.value) {
        return;
      }

      // Call refresh callback if provided, otherwise use internal one
      if (refreshCallback) {
        refreshCallback();
      } else if (refreshFolders) {
        await refreshFolders();
      }

      toast.add({
        title: "Success",
        description: `${selectedFolders.value.length} folder(s) deleted successfully!`,
        color: "success",
      });

      selectedFolders.value = [];
      isSelectionMode.value = false;
    }
  }

  async function deleteFile(file: any, refreshCallback?: () => void) {
    const isConfirmed = await confirm({
      title: "Delete File",
      content: `Are you sure you want to delete file "${file.filename || file.displayName}"? This action cannot be undone.`,
      confirmText: "Delete",
      cancelText: "Cancel",
    });

    if (isConfirmed) {
      await deleteFileApi({ id: file.id });

      if (deleteFileError.value) {
        return;
      }

      if (refreshCallback) {
        refreshCallback();
      }

      toast.add({
        title: "Success",
        description: `File "${file.filename || file.displayName}" has been deleted successfully!`,
        color: "success",
      });
    }
  }

  async function deleteSelectedFiles(fileIds: string[], refreshCallback?: () => void) {
    if (fileIds.length === 0) return;

    const isConfirmed = await confirm({
      title: "Delete Multiple Files",
      content: `Are you sure you want to delete ${fileIds.length} file(s)? This action cannot be undone.`,
      confirmText: "Delete",
      cancelText: "Cancel",
    });

    if (isConfirmed) {
      // Use batch operations as per docs recommendation
      await deleteFileApi({ ids: fileIds });

      if (deleteFileError.value) {
        return;
      }

      if (refreshCallback) {
        refreshCallback();
      }

      toast.add({
        title: "Success",
        description: `${fileIds.length} file(s) deleted successfully!`,
        color: "success",
      });
    }
  }

  return {
    // Data (only used when API call is made)
    folders,
    pending,
    refreshFolders,

    // Modal state
    showDetailModal,
    selectedFolder,

    // Selection state
    selectedFolders,
    isSelectionMode,

    // Functions
    toggleFolderSelection,
    toggleSelectionMode,
    toggleSelectAll,
    showFolderDetail,
    getContextMenuItems,
    deleteFolder,
    deleteSelectedFolders,
    deleteFile,
    deleteSelectedFiles,
  };
}
