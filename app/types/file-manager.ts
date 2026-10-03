export interface FileManagerMoveState {
  moveMode: boolean;
  sourceFolderId: string | null;
  selectedItems: string[];
  selectedFileIds: string[];
  selectedFolderIds: string[];
}

export interface FileManagerStorageOption {
  label: string;
  value: string;
  icon: string;
  isDefault: boolean;
}

export interface FileManagerUploadOptions {
  folderId?: () => string | undefined;
  onUploaded: () => Promise<unknown>;
}

export interface FileManagerDeleteResult {
  cancelled: boolean;
  deletedFolderIds: string[];
  deletedFileIds: string[];
  failed: boolean;
}
