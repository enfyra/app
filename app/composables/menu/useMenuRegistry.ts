export function useMenuRegistry() {
  const menuItems = useState<MenuItem[]>("menu-items", () => []);
  const miniSidebars = useState<MiniSidebar[]>("mini-sidebars", () => []);
  const bottomMiniSidebars = useState<MiniSidebar[]>(
    "bottom-mini-sidebars",
    () => []
  );
  const { getId } = useDatabase();

  const menuGroups = computed(() => {
    const topLevelItems = menuItems.value.filter(item => {
      if (item.type === 'Dropdown Menu') return true;
      if (item.type === 'Menu' && (!item.parent || item.parent === null)) return true;
      return false;
    });

    const groups = topLevelItems
      .map(item => {
        const children = menuItems.value.filter(child => {
          if (!child.parent) return false;
          return String(child.parent) === String(item.id) ||
                 (typeof child.parent === 'object' && String((child.parent as any).id || child.parent) === String(item.id));
        });

        return {
          ...item,
          icon: item.icon || 'lucide:circle',
          route: item.route || item.path,
          position: (item as any).position || 'top' as const,
          items: children.length > 0 ? children : (item.children || []),
          order: item.order || 0,
        };
      })
      .sort((a, b) => {
        if (a.position !== b.position) {
          return a.position === 'top' ? -1 : 1;
        }
        return (a.order || 0) - (b.order || 0);
      });

    return groups;
  });

  const registerMenuItem = (item: MenuItem) => {
    const existingIndex = menuItems.value.findIndex((m) => m.id === item.id);
    if (existingIndex > -1) {
      menuItems.value[existingIndex] = item;
    } else {
      menuItems.value.push(item);
    }
  };

  const registerMiniSidebar = (sidebar: MiniSidebar | MiniSidebar[]) => {
    if (Array.isArray(sidebar)) {
      sidebar.forEach((s) => registerSingleMiniSidebar(s));
      return;
    }

    registerSingleMiniSidebar(sidebar);
  };

  const registerSingleMiniSidebar = (sidebar: MiniSidebar) => {
    const targetArray =
      sidebar.position === "bottom" ? bottomMiniSidebars : miniSidebars;

    const existingIndex = targetArray.value.findIndex(
      (s) => s.id === sidebar.id
    );
    if (existingIndex > -1) {
      targetArray.value[existingIndex] = sidebar;
    } else {
      targetArray.value.push(sidebar);
    }
  };

  const unregisterMenuItem = (id: string) => {
    const index = menuItems.value.findIndex((m) => m.id === id);
    if (index > -1) {
      menuItems.value.splice(index, 1);
    }
  };

  const unregisterMiniSidebar = (id: string) => {
    let index = miniSidebars.value.findIndex((s) => s.id === id);
    if (index > -1) {
      miniSidebars.value.splice(index, 1);
      return;
    }

    index = bottomMiniSidebars.value.findIndex((s) => s.id === id);
    if (index > -1) {
      bottomMiniSidebars.value.splice(index, 1);
    }
  };

  const getMenuItemsBySidebar = (sidebarId: number | string) => {
    const normalizedId = String(sidebarId);
    const items = menuItems.value.filter(
      (item) => String(item.sidebarId) === normalizedId
    );
    return items.sort((a, b) => {
      const orderDiff = (a.order || 0) - (b.order || 0);
      if (orderDiff !== 0) return orderDiff;
      
      const typeOrder: Record<string, number> = { 'Dropdown Menu': 0, 'Menu': 1 };
      const aTypeOrder = a.type ? (typeOrder[a.type] ?? 2) : 2;
      const bTypeOrder = b.type ? (typeOrder[b.type] ?? 2) : 2;
      
      return aTypeOrder - bTypeOrder;
    });
  };

  const clearAllMenus = () => {
    menuItems.value = [];
    miniSidebars.value = [];
    bottomMiniSidebars.value = [];
  };

  const registerAllMenusFromApi = async (menuDefinitions: MenuDefinition[]) => {
    if (!menuDefinitions || menuDefinitions.length === 0) return;

    const dropdownMenusData = menuDefinitions
      .filter((item) => item.type === "Dropdown Menu" && item.isEnabled)
      .sort((a, b) => a.order - b.order);

    const regularMenuItems = menuDefinitions
      .filter((item) => item.type === "Menu" && item.isEnabled)
      .sort((a, b) => a.order - b.order);

    if (dropdownMenusData.length > 0) {
      dropdownMenusData.forEach((item) => {
        const itemId = getId(item);
        if (itemId) {
          const children = regularMenuItems
            .filter((menuItem) => {
              const parentId = getId(menuItem.parent);
              return parentId && String(parentId) === String(itemId);
            })
            .map((child) => ({
              ...child,
              id: String(getId(child)),
              route: child.path,
            }));

          registerMenuItem({
            ...item,
            id: String(itemId),
            route: item.path || "",
            children,
          } as any);
        }
      });
    }

    if (regularMenuItems.length > 0) {
      regularMenuItems.forEach((item) => {
        const parentId = getId(item.parent);

        if (parentId) {
          const isChildOfDropdown = dropdownMenusData.some(
            (dropdown) => String(getId(dropdown)) === String(parentId)
          );
          if (isChildOfDropdown) {
            return; // Skip children, they're already added
          }
        }

        const itemId = getId(item);
        if (itemId) {
          registerMenuItem({
            ...item,
            id: String(itemId),
            route: item.path,
          } as any);
        }
      });
    }
  };

  const reregisterAllMenus = async (
    fetchMenuDefinitions: () => Promise<{ data: MenuDefinition[] } | null>
  ) => {
    clearAllMenus();

    const menuResponse = await fetchMenuDefinitions();
    if (menuResponse?.data) {
      await registerAllMenusFromApi(menuResponse.data);
    }
  };

  const findParentMenuIdByPath = (path: string): string | number | null => {
    const parentMenu = menuItems.value.find((m) => m.route === path || m.path === path);

    if (parentMenu) {
      return parentMenu.id;
    }

    return null;
  };

  const registerTableMenusWithSidebarIds = async (tables: any[]) => {
    if (!tables || tables.length === 0) {
      const tableMenuItems = menuItems.value.filter(
        (item) =>
          item.id.startsWith("collections-") || item.id.startsWith("data-")
      );
      tableMenuItems.forEach((item) => {
        unregisterMenuItem(item.id);
      });
      return;
    }

    const tableMenuItems = menuItems.value.filter(
      (item) =>
        item.id.startsWith("collections-") || item.id.startsWith("data-")
    );
    tableMenuItems.forEach((item) => {
      unregisterMenuItem(item.id);
    });

    let collectionsParentId = menuItems.value.find((m) => m.id === "collections")?.id;
    if (!collectionsParentId) {
      const foundId = findParentMenuIdByPath("/collections");
      collectionsParentId = foundId ? String(foundId) : undefined;
    }

    let dataParentId = menuItems.value.find((m) => m.id === "data")?.id;
    if (!dataParentId) {
      const foundId = findParentMenuIdByPath("/data");
      dataParentId = foundId ? String(foundId) : undefined;
    }

    if (!collectionsParentId && !dataParentId) {
      return;
    }

    const { getRouteForTableName } = useRoutes();

    const modifiableTables = tables.filter((table) => {
      if (!table.isSystem) return true;
      return isSystemTableModifiable(table.name || table.table_name);
    });

    const nonSystemTables = tables.filter((table) => !table.isSystem);

    if (collectionsParentId) {
      modifiableTables.forEach((table) => {
        const tableName = table.name || table.table_name;
        if (!tableName) return;

        registerMenuItem({
          id: `collections-${tableName}`,
          label: table.label || table.display_name || tableName,
          route: `/collections/${tableName}`,
          icon: table.icon || "lucide:table",
          parent: collectionsParentId, // Set as child of Collections menu
          type: "Menu",
          permission: {
            and: [
              { route: `/table_definition`, actions: ["read"] },
              {
                or: [
                  { route: `/table_definition`, actions: ["create"] },
                  { route: `/table_definition`, actions: ["update"] },
                  { route: `/table_definition`, actions: ["delete"] },
                ],
              },
            ],
          },
        });
      });
    }

    if (dataParentId) {
      const { getRouteForTableName } = useRoutes();
      const routes = useState<any[]>('routes:all', () => []);

      nonSystemTables.forEach((table) => {
        const tableName = table.name || table.table_name;
        if (!tableName) return;

        const dynamicRoute = getRouteForTableName(tableName);

        const routeExists = routes.value.some((route: any) =>
          route.path === dynamicRoute && route.isEnabled !== false
        );

        if (routeExists) {
          registerMenuItem({
            id: `data-${tableName}`,
            label: table.label || table.display_name || tableName,
            route: `/data/${tableName}`,
            icon: table.icon || "lucide:database",
            parent: dataParentId, // Set as child of Data menu
            type: "Menu",
            permission: {
              or: [
                { route: dynamicRoute, actions: ["read"] }
              ]
            }
          });
        }
      });
    }
  };

  const reregisterExtensionMenus = async () => {
    const extensionMenuItems = menuItems.value.filter((item) =>
      item.id.startsWith("extension-")
    );

    extensionMenuItems.forEach((item) => {
      unregisterMenuItem(item.id);
    });
  };

  return {
    menuItems,
    miniSidebars,
    bottomMiniSidebars,
    menuGroups,

    registerMenuItem,
    registerMiniSidebar,
    unregisterMenuItem,
    unregisterMiniSidebar,

    getMenuItemsBySidebar,
    clearAllMenus,
    registerAllMenusFromApi,
    reregisterAllMenus,

    registerTableMenusWithSidebarIds,
    reregisterExtensionMenus,
  };
}
