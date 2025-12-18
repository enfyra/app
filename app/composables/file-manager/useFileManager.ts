
export function useFileManager(parentFilter?: any) {
  const apiCall = parentFilter
    ? useApi(() => "folder_definition", {
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
  const { getId } = useDatabase();

  const { execute: deleteFolderApi, error: deleteFolderError } = useApi(
    () => "/folder_definition",
    {
      method: "delete",
      errorContext: "Delete Folder",
    }
  );

  const { execute: deleteFileApi, error: deleteFileError } = useApi(
    () => "/file_definition",
    {
      method: "delete",
      errorContext: "Delete File",
    }
  );

  function showFolderDetail(folder: any) {
    const showDetailModal = useState("folder-detail-modal", () => false);
    const selectedFolder = useState<any>("folder-selected", () => null);
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
      await deleteFolderApi({ id: getId(folder) });

      if (deleteFolderError.value) {
        return;
      }

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
    folderList: any[],
    refreshCallback?: () => void
  ) {
    if (!folderList || folderList.length === 0) return;

    const folderIds = folderList.map((f) => getId(f));
    const folderNames = folderList.map((f) => f.name).filter(Boolean);

    const isConfirmed = await confirm({
      title: "Delete Multiple Folders",
      content: `Are you sure you want to delete ${
        folderList.length
      } folder(s)? This includes: ${folderNames.slice(0, 3).join(", ")}${
        folderNames.length > 3 ? ` and ${folderNames.length - 3} more` : ""
      }. This action cannot be undone.`,
      confirmText: "Delete",
      cancelText: "Cancel",
    });

    if (isConfirmed) {
      await deleteFolderApi({ ids: folderIds });

      if (deleteFolderError.value) {
        return;
      }

      if (refreshCallback) {
        refreshCallback();
      } else if (refreshFolders) {
        await refreshFolders();
      }

      toast.add({
        title: "Success",
        description: `${folderList.length} folder(s) deleted successfully!`,
        color: "success",
      });
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
      await deleteFileApi({ id: getId(file) });

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
    folders,
    pending,
    refreshFolders,
    showFolderDetail,
    getContextMenuItems,
    deleteFolder,
    deleteSelectedFolders,
    deleteFile,
    deleteSelectedFiles,
  };
}
