
export const useGlobalState = () => {
  const settings = useState<any>("global:settings", () => {});
  const storageConfigs = useState<any[]>("global:storage:configs", () => []);
  const appPackages = useState<any[]>("global:app:packages", () => []);
  const packageCacheState = useState<Map<string, any>>("global:app:packages:cache", () => new Map());
  const packageCacheTimestamp = useState<number>("global:app:packages:cache:timestamp", () => 0);

  const sidebarVisible = useState<boolean>(
    "global:sidebar:visible",
    () => true
  );
  const sidebarCollapsed = useState<boolean>(
    "global:sidebar:collapsed",
    () => false
  );
  const routeLoading = useState<boolean>("global:route:loading", () => false);

  const fileUpdateTimestamp = useState<Record<string, number>>(
    "global:file:update:timestamp",
    () => ({})
  );

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

  const {
    data: storageConfigsData,
    execute: executeFetchStorageConfigs,
  } = useApi(() => "/storage_config_definition", {
    query: {
      fields: "*",
      limit: -1,
      sort: "-createdAt",
      filter: {
        isEnabled: {
          _eq: true,
        },
      }
    },
    errorContext: "Fetch Storage Configs",
  });

  const {
    data: appPackagesData,
    execute: executeFetchAppPackages,
  } = useApi(() => "/package_definition", {
    query: {
      fields: "*",
      limit: -1,
      filter: {
        type: {
          _eq: "App",
        },
      }
    },
    errorContext: "Fetch App Packages",
  });

  async function fetchSetting() {
    await executeFetchSettings();
    settings.value = settingsData.value?.data[0] || {};
  }

  async function fetchStorageConfigs() {
    await executeFetchStorageConfigs();
    storageConfigs.value = storageConfigsData.value?.data || [];
  }

  async function fetchAppPackages() {
    await executeFetchAppPackages();
    appPackages.value = appPackagesData.value?.data || [];
    packageCacheState.value.clear();
    packageCacheTimestamp.value = Date.now();
  }

  function clearPackageCache() {
    packageCacheState.value.clear();
    packageCacheTimestamp.value = Date.now();
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
  
  const MAX_FILE_TIMESTAMPS = 100;

  function updateFileTimestamp(fileId: string) {
    const current = { ...fileUpdateTimestamp.value, [fileId]: Date.now() };
    const keys = Object.keys(current);
    if (keys.length > MAX_FILE_TIMESTAMPS) {
      keys.slice(0, keys.length - MAX_FILE_TIMESTAMPS).forEach(k => delete current[k]);
    }
    fileUpdateTimestamp.value = current;
  }
  
  function getFileTimestamp(fileId: string): number {
    return fileUpdateTimestamp.value[fileId] || 0;
  }

  return {
    settings,
    fetchSetting,
    storageConfigs,
    fetchStorageConfigs,
    appPackages,
    fetchAppPackages,
    packageCacheState,
    packageCacheTimestamp,
    clearPackageCache,
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
