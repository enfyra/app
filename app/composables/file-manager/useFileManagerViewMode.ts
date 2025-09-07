export function useFileManagerViewMode() {
  const getInitialViewMode = (): "grid" | "list" => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem("file-manager-view-mode");
      if (saved === "grid" || saved === "list") {
        return saved;
      }
    }
    return "grid";
  };

  const viewMode = ref<"grid" | "list">(getInitialViewMode());

  function toggleViewMode() {
    const newViewMode = viewMode.value === "grid" ? "list" : "grid";
    viewMode.value = newViewMode;
    
    if (typeof window !== 'undefined') {
      localStorage.setItem("file-manager-view-mode", newViewMode);
    }
  }

  function setViewMode(mode: "grid" | "list") {
    viewMode.value = mode;
    if (typeof window !== 'undefined') {
      localStorage.setItem("file-manager-view-mode", mode);
    }
  }

  return {
    viewMode,
    toggleViewMode,
    setViewMode,
  };
}