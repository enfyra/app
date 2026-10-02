import type { FileManagerMoveState } from '~/types/file-manager';

export function useFileManagerMoveState() {
  return useState<FileManagerMoveState>('file-manager:move:state', () => ({
    moveMode: false,
    sourceFolderId: null,
    selectedItems: [],
    selectedFileIds: [],
    selectedFolderIds: [],
  }));
}
