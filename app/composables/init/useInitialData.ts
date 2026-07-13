export async function useInitialData() {
  const { ensureMetadataContext } = useSchema();
  const { fetchSetting, settings } = useGlobalState();
  const { fetchMenuDefinitions, menuDefinitions } = useMenuApi();

  const [metadataContext, settingsResponse, menuResponse] = await Promise.all([
    ensureMetadataContext(),
    fetchSetting(),
    fetchMenuDefinitions(),
  ]);

  const hasSettings = Boolean(settingsResponse && settings.value);
  const hasMenus = Boolean(menuResponse || menuDefinitions.value?.data);

  if (!metadataContext) {
    throw new Error("Initial metadata context failed to load.");
  }
  if (!hasSettings) {
    throw new Error("Initial app settings failed to load.");
  }
  if (!hasMenus) {
    throw new Error("Initial menu definitions failed to load.");
  }
}
