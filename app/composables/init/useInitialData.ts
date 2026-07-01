export async function useInitialData() {
  const { fetchSchema, schemas } = useSchema();
  const { fetchSetting, settings } = useGlobalState();
  const { routes, loadRoutes } = useRoutes();
  const { fetchMenuDefinitions, menuDefinitions } = useMenuApi();
  const dbContext = useState<{ dbType: string | null; pkField: string | null }>(
    "database:context",
    () => ({ dbType: null, pkField: null })
  );

  const [schemaResponse, settingsResponse, routesResponse, menuResponse] = await Promise.all([
    fetchSchema(),
    fetchSetting(),
    loadRoutes(),
    fetchMenuDefinitions(),
  ]);

  const hasSchema = Object.keys(schemas.value).length > 0;
  const hasDatabaseContext = Boolean(dbContext.value.dbType && dbContext.value.pkField);
  const hasSettings = Boolean(settingsResponse && settings.value);
  const hasRoutes = Array.isArray(routesResponse) || Array.isArray(routes.value);
  const hasMenus = Boolean(menuResponse || menuDefinitions.value?.data);

  if (!schemaResponse && (!hasSchema || !hasDatabaseContext)) {
    throw new Error("Initial schema metadata failed to load.");
  }
  if (!hasSettings) {
    throw new Error("Initial app settings failed to load.");
  }
  if (!hasRoutes) {
    throw new Error("Initial routes failed to load.");
  }
  if (!hasMenus) {
    throw new Error("Initial menu definitions failed to load.");
  }
}
