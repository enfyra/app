export interface FileIconConfig {
  icon: string;
  color: string;
  background: string;
}

export function getFileIconAndColor(mimetype: string): FileIconConfig {
  if (!mimetype) {
    return {
      icon: "lucide:file",
      color: "text-gray-600 dark:text-gray-300",
      background: "bg-gray-100 dark:bg-gray-800",
    };
  }

  if (mimetype.startsWith("image/")) {
    return {
      icon: "lucide:image",
      color: "text-blue-600 dark:text-blue-300",
      background: "bg-blue-100 dark:bg-blue-900/30",
    };
  }

  if (mimetype.startsWith("video/")) {
    return {
      icon: "lucide:video",
      color: "text-purple-600 dark:text-purple-300",
      background: "bg-purple-100 dark:bg-purple-900/30",
    };
  }

  if (mimetype.startsWith("audio/")) {
    return {
      icon: "lucide:music",
      color: "text-green-600 dark:text-green-300",
      background: "bg-green-100 dark:bg-green-900/30",
    };
  }

  if (mimetype.includes("pdf")) {
    return {
      icon: "lucide:file-text",
      color: "text-red-600 dark:text-red-300",
      background: "bg-red-100 dark:bg-red-900/30",
    };
  }

  if (mimetype.includes("word") || mimetype.includes("document")) {
    return {
      icon: "lucide:file-text",
      color: "text-blue-600 dark:text-blue-300",
      background: "bg-blue-100 dark:bg-blue-900/30",
    };
  }

  if (mimetype.includes("excel") || mimetype.includes("spreadsheet")) {
    return {
      icon: "lucide:table",
      color: "text-green-600 dark:text-green-300",
      background: "bg-green-100 dark:bg-green-900/30",
    };
  }

  if (mimetype.includes("powerpoint") || mimetype.includes("presentation")) {
    return {
      icon: "lucide:presentation",
      color: "text-orange-600 dark:text-orange-300",
      background: "bg-orange-100 dark:bg-orange-900/30",
    };
  }

  if (mimetype.includes("zip") || mimetype.includes("rar") || mimetype.includes("7z")) {
    return {
      icon: "lucide:archive",
      color: "text-yellow-600 dark:text-yellow-300",
      background: "bg-yellow-100 dark:bg-yellow-900/30",
    };
  }

  if (mimetype.includes("text/")) {
    return {
      icon: "lucide:file-text",
      color: "text-gray-600 dark:text-gray-300",
      background: "bg-gray-100 dark:bg-gray-800",
    };
  }

  if (mimetype.includes("code") || mimetype.includes("script")) {
    return {
      icon: "lucide:code",
      color: "text-indigo-600 dark:text-indigo-300",
      background: "bg-indigo-100 dark:bg-indigo-900/30",
    };
  }

  return {
    icon: "lucide:file",
    color: "text-gray-600 dark:text-gray-300",
    background: "bg-gray-100 dark:bg-gray-800",
  };
}

export function getFileColor(mimetype: string): string {
  if (mimetype?.startsWith("image/")) {
    return "text-green-500 dark:text-green-400";
  }
  if (mimetype?.startsWith("video/")) {
    return "text-purple-500 dark:text-purple-400";
  }
  if (mimetype?.startsWith("audio/")) {
    return "text-orange-500 dark:text-orange-400";
  }
  if (mimetype?.includes("pdf") || mimetype?.startsWith("text/")) {
    return "text-red-500 dark:text-red-400";
  }
  if (mimetype?.includes("zip") || mimetype?.includes("archive")) {
    return "text-yellow-500 dark:text-yellow-400";
  }
  return "text-gray-500 dark:text-gray-400";
}