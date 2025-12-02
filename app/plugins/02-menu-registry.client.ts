export default defineNuxtPlugin(async () => {
  const { logout } = useEnfyraAuth();

  const {
    registerAllMenusFromApi,
    registerDataMenuItems,
    registerMenuItem,
  } = useMenuRegistry();
  const { schemas, fetchSchema } = useSchema();
  const { fetchSetting, fetchStorageConfigs, fetchAiConfig } = useGlobalState();
  const { confirm } = useConfirm();
  const { loadRoutes } = useRoutes();

  const { fetchMenuDefinitions } = useMenuApi();

  const [, , , , , menuResponse] = await Promise.all([
    fetchSchema(),
    fetchSetting(),
    fetchStorageConfigs(),
    fetchAiConfig(),
    loadRoutes(),
    fetchMenuDefinitions(),
  ]);

  const menuData = (menuResponse && "data" in menuResponse && Array.isArray(menuResponse.data))
    ? menuResponse.data
    : [];

  if (menuData.length > 0) {
    await registerAllMenusFromApi(menuData);
  }

  // Only register Collections if not already in API data
  const hasCollections = menuData.some(
    (item: any) => item.label === "Collections" || item.path === "/collections"
  );
  if (!hasCollections) {
    registerMenuItem({
      id: "collections",
      label: "Collections",
      icon: "lucide:table",
      route: "/collections",
      type: "Menu",
      order: 1,
      position: "top" as any,
      permission: {
        and: [
          { route: `/table_definition`, actions: ["read"] }
        ]
      }
    } as any);
  }

  // Only register Data if not already in API data
  const hasData = menuData.some(
    (item: any) => item.label === "Data" || item.path === "/data"
  );
  if (!hasData) {
    registerMenuItem({
      id: "data",
      label: "Data",
      icon: "lucide:database",
      route: "/data",
      type: "Dropdown Menu",
      order: 2,
      position: "top" as any,
    } as any);
  }

  const schemaValues = Object.values(schemas.value);
  if (schemaValues.length > 0) {
    await registerDataMenuItems(schemaValues);
  }

  registerMenuItem({
    id: "logout",
    label: "Logout",
    icon: "lucide:log-out",
    route: "",
    type: "Menu",
    order: 9999, // Put at the end
    position: "bottom",
    onClick: async () => {
      const ok = await confirm({ content: "Are you sure you want to logout?" });
      if (ok) await logout();
    },
  } as any);
});
