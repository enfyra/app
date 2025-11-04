export interface FileIconConfig {
  icon: string;
  color: string;
  background: string;
}

export function getFileIconAndColor(mimetype: string): FileIconConfig {
  if (!mimetype) {
    return {
      icon: "lucide:file",
      color: "text-gray-300",
      background: "bg-gray-800",
    };
  }

  // Image files
  if (mimetype.startsWith("image/")) {
    return {
      icon: "lucide:image",
      color: "text-blue-300",
      background: "bg-blue-900/30",
    };
  }

  // Video files
  if (mimetype.startsWith("video/")) {
    return {
      icon: "lucide:video",
      color: "text-purple-300",
      background: "bg-purple-900/30",
    };
  }

  // Audio files
  if (mimetype.startsWith("audio/")) {
    return {
      icon: "lucide:music",
      color: "text-green-300",
      background: "bg-green-900/30",
    };
  }

  // PDF files
  if (mimetype.includes("pdf")) {
    return {
      icon: "lucide:file-text",
      color: "text-red-300",
      background: "bg-red-900/30",
    };
  }

  // Document files
  if (mimetype.includes("word") || mimetype.includes("document")) {
    return {
      icon: "lucide:file-text",
      color: "text-blue-300",
      background: "bg-blue-900/30",
    };
  }

  // Spreadsheet files
  if (mimetype.includes("excel") || mimetype.includes("spreadsheet")) {
    return {
      icon: "lucide:table",
      color: "text-green-300",
      background: "bg-green-900/30",
    };
  }

  // Presentation files
  if (mimetype.includes("powerpoint") || mimetype.includes("presentation")) {
    return {
      icon: "lucide:presentation",
      color: "text-orange-300",
      background: "bg-orange-900/30",
    };
  }

  // Archive files
  if (mimetype.includes("zip") || mimetype.includes("rar") || mimetype.includes("7z")) {
    return {
      icon: "lucide:archive",
      color: "text-yellow-300",
      background: "bg-yellow-900/30",
    };
  }

  // Text files
  if (mimetype.includes("text/")) {
    return {
      icon: "lucide:file-text",
      color: "text-gray-300",
      background: "bg-gray-800",
    };
  }

  // Code files
  if (mimetype.includes("code") || mimetype.includes("script")) {
    return {
      icon: "lucide:code",
      color: "text-indigo-300",
      background: "bg-indigo-900/30",
    };
  }

  return {
    icon: "lucide:file",
    color: "text-gray-300",
    background: "bg-gray-800",
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