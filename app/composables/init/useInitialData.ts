export async function useInitialData() {
  const { ensureMetadataContext } = useSchema();
  const { fetchSetting, settings } = useGlobalState();
  const { fetchMenuDefinitions, menuDefinitions } = useMenuApi();

  const [metadataResult, settingsResult, menuResult] = await Promise.allSettled([
    ensureMetadataContext(),
    fetchSetting(),
    fetchMenuDefinitions(),
  ]);

  const metadataContext = metadataResult.status === "fulfilled"
    ? metadataResult.value
    : null;
  const settingsResponse = settingsResult.status === "fulfilled"
    ? settingsResult.value
    : null;
  const menuResponse = menuResult.status === "fulfilled"
    ? menuResult.value
    : null;
  const hasSettings = Boolean(settingsResponse && settings.value);
  const hasMenus = Boolean(menuResponse || menuDefinitions.value?.data);
  const issues = [
    metadataResult.status === "rejected"
      ? "metadata-request"
      : !metadataContext
        ? "metadata"
        : null,
    settingsResult.status === "rejected"
      ? "settings-request"
      : !hasSettings
        ? "settings"
        : null,
    menuResult.status === "rejected"
      ? "menus-request"
      : !hasMenus
        ? "menus"
        : null,
  ].filter((issue): issue is string => Boolean(issue));

  if (issues.length > 0) {
    console.warn("[Initial data] Shell started with unavailable features", issues);
  }

  return { metadataContext, hasSettings, hasMenus, issues };
}
