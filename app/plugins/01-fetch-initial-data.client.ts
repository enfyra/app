export default defineNuxtPlugin(async () => {
  const { schemas, fetchSchema } = useSchema();
  const { fetchSetting, fetchStorageConfigs, fetchAppPackages } = useGlobalState();
  const { loadRoutes } = useRoutes();
  const { fetchMenuDefinitions } = useMenuApi();

  await Promise.all([
    fetchSchema(),
    fetchSetting(),
    fetchStorageConfigs(),
    fetchAppPackages(),
    loadRoutes(),
    fetchMenuDefinitions(),
  ]);
});

