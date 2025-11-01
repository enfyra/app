export const useMenuApi = () => {
  const {
    data: menuDefinitions,
    pending: menuDefinitionsPending,
    execute: fetchMenuDefinitions,
  } = useApi<{ data: MenuApiItem[] }>(() => "/menu_definition", {
    query: computed(() => ({
      limit: 0,
      fields: "*,parent.*,children.*,sidebar.*",
    })),
    errorContext: "Fetch Menu Definitions",
  });

  const getDropdownMenus = computed(() => {
    const dropdownMenus = menuDefinitions.value?.data || [];
    return dropdownMenus
      .filter((menu: any) => menu.type === "Dropdown Menu" && menu.isEnabled)
      .sort((a: any, b: any) => a.order - b.order);
  });

  const getMenus = computed(() => {
    const menus = menuDefinitions.value?.data || [];
    return menus
      .filter((menu: any) => menu.type === "Menu" && menu.isEnabled)
      .sort((a: any, b: any) => a.order - b.order);
  });

  const getMenuItemsBySidebar = computed(() => {
    return (sidebarId: string) => {
      const allMenus = menuDefinitions.value?.data || [];
      const { getId } = useDatabase();
      const sidebarMenus = allMenus
        .filter(
          (item: any) =>
            (item.type === "Menu" || item.type === "Dropdown Menu") &&
            item.isEnabled &&
            String(getId(item.sidebar)) === sidebarId
        )
        .sort((a: any, b: any) => a.order - b.order);
      return sidebarMenus;
    };
  });

  return {
    fetchMenuDefinitions,
    menuDefinitionsPending,
    menuDefinitions,
    getDropdownMenus,
    getMenus,
    getMenuItemsBySidebar,
  };
};
