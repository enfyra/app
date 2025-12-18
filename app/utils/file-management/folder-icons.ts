export interface FolderIconConfig {
  name: string;
  color: string;
}

export function getFolderIcon(folder: any): FolderIconConfig {
  if (folder.isSystem) {
    return {
      name: folder.icon || "lucide:shield",
      color: "text-amber-500 dark:text-amber-400",
    };
  }

  return {
    name: folder.icon || "lucide:folder",
    color: "text-blue-500 dark:text-blue-400",
  };
}

export function getFolderIconName(folder: any): string {
  return getFolderIcon(folder).name;
}

export function getFolderIconColor(folder: any): string {
  return getFolderIcon(folder).color;
}

export function getDefaultFolderIcon(): string {
  return "lucide:folder";
}

export function getSystemFolderIcon(): string {
  return "lucide:shield";
}

export function getFolderOpenIcon(): string {
  return "lucide:folder-open";
}