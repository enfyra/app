export default defineNuxtPlugin(async () => {
  const { logout } = useEnfyraAuth();

  const {
    registerAllMenusFromApi,
    registerTableMenusWithSidebarIds,
    registerMiniSidebar,
  } = useMenuRegistry();
  const { schemas, fetchSchema } = useSchema();
  const { fetchSetting } = useGlobalState();
  const { confirm } = useConfirm();

  const { fetchMenuDefinitions } = useMenuApi();

  // Fetch schema, settings, and menu definitions in parallel for better performance
  const [, , menuResponse] = await Promise.all([
    fetchSchema(),
    fetchSetting(),
    fetchMenuDefinitions(),
  ]);

  if (
    menuResponse &&
    "data" in menuResponse &&
    Array.isArray(menuResponse.data) &&
    menuResponse.data.length > 0
  ) {
    await registerAllMenusFromApi(menuResponse.data);
  }

  const schemaValues = Object.values(schemas.value);
  if (schemaValues.length > 0) {
    await registerTableMenusWithSidebarIds(schemaValues);
  }

  // Register logout button as bottom mini sidebar
  registerMiniSidebar({
    id: "logout",
    label: "Logout",
    icon: "lucide:log-out",
    position: "bottom",
    class: "rotate-180 bg-red-800 hover:bg-red-900",
    onClick: async () => {
      const ok = await confirm({ content: "Are you sure you want to logout?" });
      if (ok) await logout();
    },
  });
});
