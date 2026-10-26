export interface FileLibraryRecord {
  id?: string | number;
  _id?: string;
  filename?: string | null;
  title?: string | null;
  mimetype?: string | null;
  type?: string;
  filesize?: string | number | null;
  size?: string | number | null;
  updatedAt?: string | null;
  storageConfig?: { type?: string | null; name?: string | null } | null;
}

export interface FileLibraryDisplayRow extends FileLibraryRecord {
  assetUrl: string;
  displayName: string;
  formattedUpdatedAt: string;
}

export interface FileItem {
  id: string;
  displayName: string;
  icon: string;
  size?: string | null;
  modifiedAt: string;
  assetUrl?: string;
  mimetype: string;
  filename?: string;
  title?: string;
  filesize?: string;
  updatedAt?: string;
  createdAt?: string;
}
