import type { FileManagerDeleteResult } from '~/types/file-manager';

export function useFileManager(parentFilter?: any) {
  const apiCall = parentFilter
    ? useApi(() => "enfyra_folder", {
        query: computed(() => ({
          limit: 100,
          fields: "*",
          sort: "order,name",
          filter: parentFilter,
        })),
      })
    : { data: ref(null), pending: ref(false), execute: () => {} };

  const { data: folders, pending, execute: refreshFolders } = apiCall;

  const notify = useNotify();
  const { confirm } = useConfirm();
  const { getId } = useDatabase();

  const { execute: deleteFolderApi, executeWithResult: deleteFolderWithResult, error: deleteFolderError } = useApi(
    () => "/enfyra_folder",
    {
      method: "delete",
      errorContext: "Delete Folder",
    }
  );

  const { execute: deleteFileApi, executeWithResult: deleteFileWithResult, error: deleteFileError } = useApi(
    () => "/enfyra_file",
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

      notify.success("Success", `Folder "${folder.name}" has been deleted successfully!`);
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

      notify.success("Success", `${folderList.length} folder(s) deleted successfully!`);
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

      notify.success("Success", `File "${file.filename || file.displayName}" has been deleted successfully!`);
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

      notify.success("Success", `${fileIds.length} file(s) deleted successfully!`);
    }
  }

  async function deleteSelectedItems(folderList: any[], fileIds: string[]): Promise<FileManagerDeleteResult> {
    const result: FileManagerDeleteResult = { cancelled: true, failed: false, deletedFolderIds: [], deletedFileIds: [] };
    const folderIds = [...new Set(folderList.map(folder => String(getId(folder))))];
    const selectedFileIds = [...new Set(fileIds.map(String))];
    const total = folderIds.length + selectedFileIds.length;
    if (total === 0) return result;
    const confirmed = await confirm({
      title: 'Delete selected items',
      content: `Delete ${folderIds.length} folder(s) and ${selectedFileIds.length} file(s)? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
    });
    if (!confirmed) return result;
    result.cancelled = false;

    for (const id of folderIds) {
      const response = await deleteFolderWithResult({ id });
      if (!response.ok) {
        result.failed = true;
        break;
      }
      result.deletedFolderIds.push(id);
    }
    if (!result.failed) {
      for (const id of selectedFileIds) {
        const response = await deleteFileWithResult({ id });
        if (!response.ok) {
          result.failed = true;
          break;
        }
        result.deletedFileIds.push(id);
      }
    }
    const deleted = result.deletedFolderIds.length + result.deletedFileIds.length;
    if (result.failed) notify.warning('Delete incomplete', `${deleted} item(s) deleted. Remaining items are still selected.`);
    else notify.success('Success', `${deleted} item(s) deleted successfully!`);
    return result;
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
    deleteSelectedItems,
  };
}
