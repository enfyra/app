export async function useInitialData() {
  const { fetchSchema, schemas } = useSchema();
  const { fetchSetting, settings } = useGlobalState();
  const { fetchMenuDefinitions, menuDefinitions } = useMenuApi();
  const dbContext = useState<{ dbType: string | null; pkField: string | null }>(
    "database:context",
    () => ({ dbType: null, pkField: null })
  );

  const [schemaResponse, settingsResponse, menuResponse] = await Promise.all([
    fetchSchema(),
    fetchSetting(),
    fetchMenuDefinitions(),
  ]);

  const hasSchema = Object.keys(schemas.value).length > 0;
  const hasDatabaseContext = Boolean(dbContext.value.dbType && dbContext.value.pkField);
  const hasSettings = Boolean(settingsResponse && settings.value);
  const hasMenus = Boolean(menuResponse || menuDefinitions.value?.data);

  if (!schemaResponse && (!hasSchema || !hasDatabaseContext)) {
    throw new Error("Initial schema metadata failed to load.");
  }
  if (!hasSettings) {
    throw new Error("Initial app settings failed to load.");
  }
  if (!hasMenus) {
    throw new Error("Initial menu definitions failed to load.");
  }
}
