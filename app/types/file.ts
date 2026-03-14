

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

export interface FileGridProps {
  files: FileItem[];
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  isSelectionMode?: boolean;
  selectedItems?: string[];
  copyFileUrl?: (file: FileItem) => void;
}

export interface FileContextMenu {
  label: string;
  icon: string;
  onSelect: () => void;
  color?:
    | "primary"
    | "secondary"
    | "success"
    | "info"
    | "warning"
    | "error"
    | "neutral";
}
