import type { MenuApiItem } from '~/utils/types/menu';

export const useMenuApi = () => {
  const sharedMenuDefinitions = useState<{ data: MenuApiItem[] } | null>("menu-definitions", () => null);
  const sharedMenuDefinitionsPending = useState<boolean>("menu-definitions-pending", () => false);

  const {
    data: menuDefinitions,
    pending: menuDefinitionsPending,
    execute: fetchMenuDefinitions,
  } = useApi<{ data: MenuApiItem[] }>(() => "/menu_definition", {
    query: computed(() => ({
      limit: 0,
      fields: "*,parent.*,children.*,sidebar.*,extension.*",
    })),
    errorContext: "Fetch Menu Definitions",
  });

  watch(menuDefinitions, (newVal) => {
    if (newVal) {
      sharedMenuDefinitions.value = newVal;
    }
  }, { immediate: true, deep: true });

  watch(menuDefinitionsPending, (newVal) => {
    sharedMenuDefinitionsPending.value = newVal;
  }, { immediate: true });

  const wrappedFetchMenuDefinitions = async () => {
    const result = await fetchMenuDefinitions();
    if (result && menuDefinitions.value) {
      sharedMenuDefinitions.value = menuDefinitions.value;
    }
    return result;
  };

  const finalMenuDefinitions = computed(() => sharedMenuDefinitions.value || menuDefinitions.value);
  const finalPending = computed(() => sharedMenuDefinitionsPending.value || menuDefinitionsPending.value);

  const getDropdownMenus = computed<MenuApiItem[]>(() => {
    const dropdownMenus = finalMenuDefinitions.value?.data || [];
    return dropdownMenus
      .filter((menu: MenuApiItem) => menu.type === "Dropdown Menu" && menu.isEnabled)
      .sort((a: MenuApiItem, b: MenuApiItem) => a.order - b.order);
  });

  const getMenus = computed<MenuApiItem[]>(() => {
    const menus = finalMenuDefinitions.value?.data || [];
    return menus
      .filter((menu: MenuApiItem) => menu.type === "Menu" && menu.isEnabled)
      .sort((a: MenuApiItem, b: MenuApiItem) => a.order - b.order);
  });

  const getMenuItemsBySidebar = computed(() => {
    return (sidebarId: string): MenuApiItem[] => {
      const allMenus = finalMenuDefinitions.value?.data || [];
      const { getId } = useDatabase();
      const sidebarMenus = allMenus
        .filter(
          (item: MenuApiItem) =>
            (item.type === "Menu" || item.type === "Dropdown Menu") &&
            item.isEnabled &&
            String(getId(item.sidebar)) === sidebarId
        )
        .sort((a: MenuApiItem, b: MenuApiItem) => a.order - b.order);
      return sidebarMenus;
    };
  });

  return {
    fetchMenuDefinitions: wrappedFetchMenuDefinitions,
    menuDefinitionsPending: finalPending,
    menuDefinitions: finalMenuDefinitions,
    getDropdownMenus,
    getMenus,
    getMenuItemsBySidebar,
  };
};
