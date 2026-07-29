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
