export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function transformFileForDisplay(file: any) {
  return {
    ...file,
    displayName: file.filename || file.title || "Untitled",
    size: formatFileSize(parseInt(file.filesize || "0")),
    modifiedAt: file.updatedAt || file.createdAt || "",
    assetUrl: `/assets/${file.id}`,
    previewUrl: `/assets/${file.id}`,
  };
}