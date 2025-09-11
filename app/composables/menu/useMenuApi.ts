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

  const getMiniSidebars = computed(() => {
    const miniSidebars = menuDefinitions.value?.data || [];
    return miniSidebars
      .filter((menu: any) => menu.type === "Mini Sidebar" && menu.isEnabled)
      .sort((a: any, b: any) => a.order - b.order);
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
      // Get both regular menus and dropdown menus for the sidebar
      const allMenus = menuDefinitions.value?.data || [];
      const sidebarMenus = allMenus
        .filter(
          (item: any) =>
            (item.type === "Menu" || item.type === "Dropdown Menu") &&
            item.isEnabled &&
            item.sidebar?.id?.toString() === sidebarId
        )
        .sort((a: any, b: any) => a.order - b.order);
      return sidebarMenus;
    };
  });

  return {
    fetchMenuDefinitions,
    menuDefinitionsPending,
    menuDefinitions,
    getMiniSidebars,
    getDropdownMenus,
    getMenus,
    getMenuItemsBySidebar,
  };
};
