import { resolveComponent, markRaw } from "vue";

export function useMenuRegistry() {
  const menuItems = useState<MenuItem[]>("menu-items", () => []);
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

  const registerDataMenuItems = async (
    tables: any[],
    getRouteForTableName?: (tableName: string) => string,
    routes?: Ref<any[]> | any[]
  ) => {
    // Find Data parent menu
    let dataParentId = menuItems.value.find((m) => m.id === "data")?.id;
    if (!dataParentId) {
      const foundId = findParentMenuIdByPath("/data");
      dataParentId = foundId ? String(foundId) : undefined;
    }

    if (!dataParentId) {
      return;
    }

    // Clear existing data menu items
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
