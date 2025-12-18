
export function useFileManagerMove() {
  const moveState = useState("file-manager:move:state", () => ({
    moveMode: false as boolean,
    sourceFolderId: null as string | null,
    selectedItems: [] as string[],
    selectedFileIds: [] as string[],
    selectedFolderIds: [] as string[],
  }));
  
  const route = useRoute();
  const { confirm } = useConfirm();
  const toast = useToast();

  const {
    execute: patchFiles,
    error: patchFilesError,
    pending: patchFilesPending,
  } = useApi(() => "/file_definition", {
    method: "patch",
    errorContext: "Move Files",
  });

  const {
    execute: patchFolders,
    error: patchFoldersError,
    pending: patchFoldersPending,
  } = useApi(() => "/folder_definition", {
    method: "patch",
    errorContext: "Move Folders",
  });

  const isMoveMode = computed(() => moveState.value.moveMode);
  const isAnyMovePending = computed(() => !!(patchFilesPending.value || patchFoldersPending.value));

  function startMoveMode(selectedItems: string[], folders: any[], files: any[], parentId?: string) {
    if (selectedItems.length === 0) return;
    
    if (!moveState.value.sourceFolderId) {
      moveState.value.sourceFolderId = parentId || (route.params.id as string);
    }
    
    moveState.value.selectedItems = [...selectedItems];
    
    moveState.value.selectedFolderIds = selectedItems.filter((id) =>
      folders.find((f) => f.id === id)
    );
    moveState.value.selectedFileIds = selectedItems.filter((id) =>
      files.find((f) => f.id === id)
    );
    
    moveState.value.moveMode = true;
  }

  function cancelMoveMode() {
    moveState.value.moveMode = false;
    moveState.value.selectedItems = [];
    moveState.value.selectedFileIds = [];
    moveState.value.selectedFolderIds = [];
    moveState.value.sourceFolderId = null;
    return []; 
  }

  function isMoveHereDisabled(parentId?: string): boolean {
    const currentFolderId = parentId || (route.params.id as string | undefined);
    return !moveState.value.moveMode || currentFolderId === moveState.value.sourceFolderId;
  }

  async function handleMoveHere(parentId?: string, onSuccess?: () => void) {
    if (isMoveHereDisabled(parentId)) return;

    const folderIds = [...(moveState.value.selectedFolderIds || [])];
    const fileIds = [...(moveState.value.selectedFileIds || [])];

    if (folderIds.length === 0 && fileIds.length === 0) return;

    const destinationId = parentId || (route.params.id as string | undefined);
    const totalCount = fileIds.length + folderIds.length;
    
    const isConfirmed = await confirm({
      title: "Move items",
      content: `Are you sure you want to move ${totalCount} item(s) here?`,
      confirmText: "Move",
      cancelText: "Cancel",
    });
    
    if (!isConfirmed) return;

    if (destinationId && folderIds.includes(destinationId)) {
      toast.add({
        title: "Invalid move",
        description: "A folder cannot be moved into itself.",
        color: "warning",
      });
      return;
    }

    let hasError = false;

    if (fileIds.length > 0) {
      const fileBody = destinationId ? { folder: { id: destinationId } } : { folder: null };
      await patchFiles({ ids: fileIds, body: fileBody });
      if (patchFilesError.value) hasError = true;
    }

    if (folderIds.length > 0 && !hasError) {
      const folderBody = destinationId ? { parent: { id: destinationId } } : { parent: null };
      await patchFolders({ ids: folderIds, body: folderBody });
      if (patchFoldersError.value) hasError = true;
    }

    if (!hasError) {
      toast.add({
        title: "Success",
        description: `${totalCount} item(s) moved successfully!`,
        color: "success",
      });
      onSuccess?.();
    } else {
      toast.add({
        title: "Move failed",
        description: "Please try again.",
        color: "error",
      });
    }

    return !hasError;
  }

  function clearFileManagerState() {
    moveState.value = {
      moveMode: false,
      sourceFolderId: null,
      selectedItems: [],
      selectedFileIds: [],
      selectedFolderIds: [],
    };
  }

  return {
    isMoveMode,
    isAnyMovePending,
    moveState,
    startMoveMode,
    cancelMoveMode,
    isMoveHereDisabled,
    handleMoveHere,
    clearFileManagerState,
  };
}