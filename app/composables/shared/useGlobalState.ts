
export const useGlobalState = () => {
  const settings = useState<any>("global:settings", () => {});
  const storageConfigs = useState<any[]>("global:storage:configs", () => []);
  const aiConfigs = useState<any[]>("global:ai:configs", () => []);
  const aiConfig = useState<any>("global:ai:config", () => {});

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
    data: aiConfigData,
    execute: executeFetchAiConfig,
  } = useApi(() => "/ai_config_definition", {
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

    errorContext: "Fetch AI Config",
  });

  async function fetchSetting() {
    await executeFetchSettings();
    settings.value = settingsData.value?.data[0] || {};
  }

  async function fetchStorageConfigs() {
    await executeFetchStorageConfigs();
    storageConfigs.value = storageConfigsData.value?.data || [];
  }

  async function fetchAiConfig() {
    await executeFetchAiConfig();
    const data = aiConfigData.value?.data || [];
    aiConfigs.value = data;
    aiConfig.value = data[0] || {};
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
    storageConfigs,
    fetchStorageConfigs,
    aiConfigs,
    aiConfig,
    fetchAiConfig,
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
