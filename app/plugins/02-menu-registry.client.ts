import SidebarUserInfo from "../components/sidebar/UserInfo.vue";

export default defineNuxtPlugin(async () => {
  const { logout } = useEnfyraAuth();

  const {
    registerAllMenusFromApi,
    registerDataMenuItems,
    registerMenuItem,
  } = useMenuRegistry();
  const { schemas } = useSchema();
  const { confirm } = useConfirm();
  const { getRouteForTableName } = useRoutes();
  const routes = useState<any[]>('routes:all', () => []);

  const { menuDefinitions } = useMenuApi();
  const menuData = (menuDefinitions.value && "data" in menuDefinitions.value && Array.isArray(menuDefinitions.value.data))
    ? menuDefinitions.value.data
    : [];

  if (menuData.length > 0) {
    await registerAllMenusFromApi(menuData);
  }

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
    const getRouteForTableNameWithSchemas = (tableName: string) => 
      getRouteForTableName(tableName, schemas.value);
    await registerDataMenuItems(schemaValues, getRouteForTableNameWithSchemas, routes);
  }

  registerMenuItem({
    id: "user-info",
    label: "User Info",
    type: "Menu",
    order: 9998,
    position: "bottom",
    component: SidebarUserInfo,
  } as any);

  registerMenuItem({
    id: "logout",
    label: "Logout",
    icon: "lucide:log-out",
    route: "",
    type: "Menu",
    order: 9999,
    position: "bottom",
    onClick: async () => {
      const ok = await confirm({ content: "Are you sure you want to logout?" });
      if (ok) await logout();
    },
  } as any);
});

