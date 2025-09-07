// useEnfyraApi is auto-imported in Nuxt

export function useFileManagerMove() {
  // File Manager Move State
  const moveState = useState("file-manager:move:state", () => ({
    moveMode: false as boolean,
    sourceFolderId: null as string | null,
    selectedItems: [] as string[],
    selectedFileIds: [] as string[],
    selectedFolderIds: [] as string[],
  }));
  
  const selectedFoldersForDelete = useState<string[]>(
    "file-manager:folder:selected:list",
    () => []
  );
  
  const route = useRoute();
  const { confirm } = useConfirm();
  const toast = useToast();

  // API instances for moving
  const {
    execute: patchFiles,
    error: patchFilesError,
    pending: patchFilesPending,
  } = useEnfyraApi(() => "/file_definition", {
    method: "patch",
    errorContext: "Move Files",
  });

  const {
    execute: patchFolders,
    error: patchFoldersError,
    pending: patchFoldersPending,
  } = useEnfyraApi(() => "/folder_definition", {
    method: "patch",
    errorContext: "Move Folders",
  });

  const isMoveMode = computed(() => moveState.value.moveMode);
  const isAnyMovePending = computed(() => !!(patchFilesPending.value || patchFoldersPending.value));

  function startMoveMode(selectedItems: string[], folders: any[], files: any[], parentId?: string) {
    if (selectedItems.length === 0) return;
    
    // Capture current folder as source
    if (!moveState.value.sourceFolderId) {
      moveState.value.sourceFolderId = parentId || (route.params.id as string);
    }
    
    moveState.value.selectedItems = [...selectedItems];
    
    // Split ids by type for stable counts display across navigation
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
    return []; // Return empty array to clear local selection
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

    // Prevent moving folder into itself
    if (destinationId && folderIds.includes(destinationId)) {
      toast.add({
        title: "Invalid move",
        description: "A folder cannot be moved into itself.",
        color: "warning",
      });
      return;
    }

    let hasError = false;

    // Move files
    if (fileIds.length > 0) {
      const fileBody = destinationId ? { folder: { id: destinationId } } : { folder: null };
      await patchFiles({ ids: fileIds, body: fileBody });
      if (patchFilesError.value) hasError = true;
    }

    // Move folders
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
    selectedFoldersForDelete.value = [];
  }

  return {
    isMoveMode,
    isAnyMovePending,
    moveState,
    selectedFoldersForDelete,
    startMoveMode,
    cancelMoveMode,
    isMoveHereDisabled,
    handleMoveHere,
    clearFileManagerState,
  };
}