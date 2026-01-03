export default defineNuxtPlugin(async () => {
  const { schemas, fetchSchema } = useSchema();
  const { fetchSetting, fetchStorageConfigs, fetchAiConfig, fetchAppPackages } = useGlobalState();
  const { loadRoutes } = useRoutes();
  const { fetchMenuDefinitions } = useMenuApi();

  await Promise.all([
    fetchSchema(),
    fetchSetting(),
    fetchStorageConfigs(),
    fetchAiConfig(),
    fetchAppPackages(),
    loadRoutes(),
    fetchMenuDefinitions(),
  ]);
});

