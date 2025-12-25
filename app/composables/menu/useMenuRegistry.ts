import { resolveComponent, markRaw } from "vue";

export function useMenuRegistry() {
  const menuItems = useState<MenuItem[]>("menu-items", () => []);
  const { getId } = useDatabase();

  const menuGroups = computed(() => {
    const topLevelItems = menuItems.value.filter(item => {
      if (!item.parent) {
        if (item.type === 'Dropdown Menu') return true;
        if (item.type === 'Menu') return true;
      }
      return false;
    });

    function buildMenuTree(item: any): any {
      const children = menuItems.value.filter(child => {
        if (!child.parent) return false;
        return String(child.parent) === String(item.id);
      });

      return {
        ...item,
        icon: item.icon || 'lucide:circle',
        route: item.route || item.path,
        position: (item as any).position || 'top' as const,
        items: children.length > 0 ? children.map(buildMenuTree) : (item.children || []).map(buildMenuTree),
        order: item.order || 0,
      };
    }

    const groups = topLevelItems
      .map(buildMenuTree)
      .sort((a, b) => {
        if (a.position !== b.position) {
          return a.position === 'top' ? -1 : 1;
        }
        return (a.order || 0) - (b.order || 0);
      });

    return groups;
  });

  const registerMenuItem = (item: MenuItem) => {
    const processedItem: MenuItem = { ...item };

    if (processedItem.component) {
      if (typeof processedItem.component === "string") {
        try {
          const componentName = processedItem.component;
          const resolved = resolveComponent(componentName as any);
          if (resolved && typeof resolved !== "string") {
            processedItem.component = markRaw(resolved);
          }
        } catch (error) {
          console.warn(
            `Failed to resolve menu component: ${String(processedItem.component)}`,
            error
          );
        }
      } else {
        processedItem.component = markRaw(processedItem.component);
      }
    }

    const existingIndex = menuItems.value.findIndex((m) => m.id === item.id);
    if (existingIndex > -1) {
      menuItems.value[existingIndex] = processedItem;
    } else {
      menuItems.value.push(processedItem);
    }
  };

  const unregisterMenuItem = (id: string) => {
    const index = menuItems.value.findIndex((m) => m.id === id);
    if (index > -1) {
      menuItems.value.splice(index, 1);
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
  };

  const registerAllMenusFromApi = async (menuDefinitions: MenuDefinition[]) => {
    if (!menuDefinitions || menuDefinitions.length === 0) return;

    const allMenus = menuDefinitions
      .filter((item) => item.isEnabled)
      .sort((a, b) => a.order - b.order);

    function buildChildren(parentId: string | number): any[] {
      return allMenus
        .filter((menuItem) => {
          const menuParentId = getId(menuItem.parent);
          return menuParentId && String(menuParentId) === String(parentId);
        })
        .map((child) => {
          const childId = getId(child);
          return {
            ...child,
            id: String(childId),
            route: child.path,
            children: childId ? buildChildren(childId) : [],
          };
        });
    }

    allMenus.forEach((item) => {
      const itemId = getId(item);
      if (!itemId) return;

      const parentId = getId(item.parent);
      const children = buildChildren(itemId);
      
      registerMenuItem({
        ...item,
        id: String(itemId),
        route: item.path || "",
        parent: parentId ? String(parentId) : undefined,
        children,
      } as any);
    });
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

  const registerDataMenuItems = async (
    tables: any[],
    getRouteForTableName?: (tableName: string) => string,
    routes?: Ref<any[]> | any[]
  ) => {
    
    let dataParentId = menuItems.value.find((m) => m.id === "data")?.id;
    if (!dataParentId) {
      const foundId = findParentMenuIdByPath("/data");
      dataParentId = foundId ? String(foundId) : undefined;
    }

    if (!dataParentId) {
      return;
    }

    const tableMenuItems = menuItems.value.filter(
      (item) => item.id.startsWith("data-")
    );
    tableMenuItems.forEach((item) => {
      unregisterMenuItem(item.id);
    });

    if (!tables || tables.length === 0) {
      return;
    }

    const getRoute = getRouteForTableName || ((tableName: string) => `/${tableName}`);
    const routesRef = routes || useState<any[]>('routes:all', () => []);
    const routesValue = isRef(routesRef) ? routesRef.value : routesRef;
    const nonSystemTables = tables.filter((table) => !table.isSystem);

    nonSystemTables.forEach((table) => {
      const tableName = table.name || table.table_name;
      if (!tableName) return;

      const dynamicRoute = getRoute(tableName);

      const routeExists = routesValue.some((route: any) =>
        route.path === dynamicRoute && route.isEnabled !== false
      );

      if (routeExists) {
        registerMenuItem({
          id: `data-${tableName}`,
          label: table.label || table.display_name || tableName,
          route: `/data/${tableName}`,
          icon: table.icon || "lucide:database",
          parent: dataParentId,
          type: "Menu",
          permission: {
            or: [
              { route: dynamicRoute, actions: ["read"] }
            ]
          }
        });
      }
    });
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
    menuGroups,

    registerMenuItem,
    unregisterMenuItem,

    getMenuItemsBySidebar,
    clearAllMenus,
    registerAllMenusFromApi,
    reregisterAllMenus,

    registerDataMenuItems,
    reregisterExtensionMenus,
  };
}
