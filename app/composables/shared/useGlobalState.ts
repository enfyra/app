
export const useGlobalState = () => {
  const settings = useState<any>("global:settings", () => {});

  const sidebarVisible = useState<boolean>(
    "global:sidebar:visible",
    () => true
  );
  const sidebarCollapsed = useState<boolean>(
    "global:sidebar:collapsed",
    () => false
  );
  const routeLoading = useState<boolean>("global:route:loading", () => false);
  
  // Global file update tracker for cache busting
  const fileUpdateTimestamp = useState<Record<string, number>>(
    "global:file:update:timestamp",
    () => ({})
  );

  // API composable for fetching settings
  const {
    data: settingsData,
    pending: settingsPending,
    execute: executeFetchSettings,
  } = useApi(() => "/setting_definition", {
    query: {
      fields: ["*", "methods.*"].join(","),
      limit: 0,
    },
    errorContext: "Fetch Settings",
  });

  async function fetchSetting() {
    await executeFetchSettings();
    settings.value = settingsData.value?.data[0] || {};
  }


  function toggleSidebar() {
    sidebarVisible.value = !sidebarVisible.value;
  }

  function setSidebarVisible(visible: boolean) {
    sidebarVisible.value = visible;
  }

  function toggleSidebarCollapsed() {
    sidebarCollapsed.value = !sidebarCollapsed.value;
  }

  function setSidebarCollapsed(collapsed: boolean) {
    sidebarCollapsed.value = collapsed;
  }

  function setRouteLoading(loading: boolean) {
    routeLoading.value = loading;
  }
  
  function updateFileTimestamp(fileId: string) {
    fileUpdateTimestamp.value = {
      ...fileUpdateTimestamp.value,
      [fileId]: Date.now()
    };
  }
  
  function getFileTimestamp(fileId: string): number {
    return fileUpdateTimestamp.value[fileId] || 0;
  }

  return {
    settings,
    fetchSetting,
    sidebarVisible,
    sidebarCollapsed,
    routeLoading,
    toggleSidebar,
    setSidebarVisible,
    toggleSidebarCollapsed,
    setSidebarCollapsed,
    setRouteLoading,
    fileUpdateTimestamp,
    updateFileTimestamp,
    getFileTimestamp,
  };
};
