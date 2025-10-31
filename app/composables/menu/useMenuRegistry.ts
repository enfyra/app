export function useMenuRegistry() {
  const menuItems = useState<MenuItem[]>("menu-items", () => []);
  const miniSidebars = useState<MiniSidebar[]>("mini-sidebars", () => []);
  const bottomMiniSidebars = useState<MiniSidebar[]>(
    "bottom-mini-sidebars",
    () => []
  );
  const { getId } = useDatabase();

  // Computed property to create unified menu groups from menu items
  const menuGroups = computed(() => {
    // Get all top-level menu items (Dropdown Menu and standalone Menu without parent)
    const topLevelItems = menuItems.value.filter(item => {
      // Include Dropdown Menu type
      if (item.type === 'Dropdown Menu') return true;
      // Include Menu type without parent or with null parent
      if (item.type === 'Menu' && (!item.parent || item.parent === null)) return true;
      return false;
    });

    // Convert to menu group format and rebuild children
    const groups = topLevelItems
      .map(item => {
        // Find all children of this item (including dynamically added tables)
        const children = menuItems.value.filter(child => {
          if (!child.parent) return false;
          // Match by ID (string comparison for safety)
          return String(child.parent) === String(item.id) ||
                 (typeof child.parent === 'object' && String((child.parent as any).id || child.parent) === String(item.id));
        });

        return {
          id: item.id,
          label: item.label,
          icon: item.icon || 'lucide:circle',
          route: item.route || item.path,
          permission: item.permission,
          position: (item as any).position || 'top' as const,
          items: children.length > 0 ? children : (item.children || []),
          order: item.order || 0,
          type: item.type,
        };
      })
      .sort((a, b) => {
        // Sort by position first (top before bottom)
        if (a.position !== b.position) {
          return a.position === 'top' ? -1 : 1;
        }
        // Then by order
        return (a.order || 0) - (b.order || 0);
      });

    return groups;
  });

  const registerMenuItem = (item: MenuItem) => {
    const existingIndex = menuItems.value.findIndex((m) => m.id === item.id);
    if (existingIndex > -1) {
      // Replace existing item
      menuItems.value[existingIndex] = item;
    } else {
      menuItems.value.push(item);
    }
  };

  const registerMiniSidebar = (sidebar: MiniSidebar | MiniSidebar[]) => {
    // Handle array input
    if (Array.isArray(sidebar)) {
      sidebar.forEach((s) => registerSingleMiniSidebar(s));
      return;
    }

    // Handle single object
    registerSingleMiniSidebar(sidebar);
  };

  const registerSingleMiniSidebar = (sidebar: MiniSidebar) => {
    // Determine which array to use based on position (default to "top")
    const targetArray =
      sidebar.position === "bottom" ? bottomMiniSidebars : miniSidebars;

    const existingIndex = targetArray.value.findIndex(
      (s) => s.id === sidebar.id
    );
    if (existingIndex > -1) {
      // Replace existing sidebar
      targetArray.value[existingIndex] = sidebar;
    } else {
      // Add new sidebar
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
    // Try to remove from top sidebars
    let index = miniSidebars.value.findIndex((s) => s.id === id);
    if (index > -1) {
      miniSidebars.value.splice(index, 1);
      return;
    }

    // Try to remove from bottom sidebars
    index = bottomMiniSidebars.value.findIndex((s) => s.id === id);
    if (index > -1) {
      bottomMiniSidebars.value.splice(index, 1);
    }
  };

  const getMenuItemsBySidebar = (sidebarId: number | string) => {
    // Normalize sidebarId for comparison
    const normalizedId = String(sidebarId);
    const items = menuItems.value.filter(
      (item) => String(item.sidebarId) === normalizedId
    );
    // Sort by order field, then by type (Dropdown Menu first, then Menu)
    return items.sort((a, b) => {
      // First sort by order
      const orderDiff = (a.order || 0) - (b.order || 0);
      if (orderDiff !== 0) return orderDiff;
      
      // If same order, prioritize by type: Dropdown Menu first, then Menu
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

    // NEW SYSTEM: No more Mini Sidebar! Only Dropdown Menu and Menu
    const dropdownMenusData = menuDefinitions
      .filter((item) => item.type === "Dropdown Menu" && item.isEnabled)
      .sort((a, b) => a.order - b.order);

    const regularMenuItems = menuDefinitions
      .filter((item) => item.type === "Menu" && item.isEnabled)
      .sort((a, b) => a.order - b.order);

    // Register Dropdown Menus (top-level groups with children)
    if (dropdownMenusData.length > 0) {
      dropdownMenusData.forEach((item) => {
        const itemId = getId(item);
        if (itemId) {
          // Find children of this dropdown
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

    // Register standalone Menu items (without parent)
    if (regularMenuItems.length > 0) {
      regularMenuItems.forEach((item) => {
        const parentId = getId(item.parent);

        // Skip if it's a child of a dropdown (already registered as children)
        if (parentId) {
          const isChildOfDropdown = dropdownMenusData.some(
            (dropdown) => String(getId(dropdown)) === String(parentId)
          );
          if (isChildOfDropdown) {
            return; // Skip children, they're already added
          }
        }

        // Register standalone menu items (no parent)
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

  // Function to reregister all menus (clear + fetch + register)
  const reregisterAllMenus = async (
    fetchMenuDefinitions: () => Promise<{ data: MenuDefinition[] } | null>
  ) => {
    // Clear existing menus
    clearAllMenus();

    // Fetch and register all menu definitions from API
    const menuResponse = await fetchMenuDefinitions();
    if (menuResponse?.data) {
      await registerAllMenusFromApi(menuResponse.data);
    }
  };

  // Function to find parent menu ID by path (for table registration)
  const findParentMenuIdByPath = (path: string): string | number | null => {
    // Look through menu items to find one with matching route
    const parentMenu = menuItems.value.find((m) => m.route === path || m.path === path);

    if (parentMenu) {
      return parentMenu.id;
    }

    return null;
  };

  // Table menu registration functions (from useMenuRegistry)
  const registerTableMenusWithSidebarIds = async (tables: any[]) => {
    if (!tables || tables.length === 0) {
      // Clear all table menus if no tables provided
      const tableMenuItems = menuItems.value.filter(
        (item) =>
          item.id.startsWith("collections-") || item.id.startsWith("data-")
      );
      tableMenuItems.forEach((item) => {
        unregisterMenuItem(item.id);
      });
      return;
    }

    // Clear existing table menu items before registering new ones
    const tableMenuItems = menuItems.value.filter(
      (item) =>
        item.id.startsWith("collections-") || item.id.startsWith("data-")
    );
    tableMenuItems.forEach((item) => {
      unregisterMenuItem(item.id);
    });

    // Find the collections and data parent menu IDs
    // First try to find by ID (most reliable), then fallback to path
    let collectionsParentId = menuItems.value.find((m) => m.id === "collections")?.id;
    if (!collectionsParentId) {
      collectionsParentId = findParentMenuIdByPath("/collections");
    }

    let dataParentId = menuItems.value.find((m) => m.id === "data")?.id;
    if (!dataParentId) {
      dataParentId = findParentMenuIdByPath("/data");
    }

    // If we can't find any parent menus, don't register table menus
    if (!collectionsParentId && !dataParentId) {
      return;
    }

    // Get route mapping for tables
    const { getRouteForTableName } = useRoutes();

    // Filter tables that can be modified in collections
    const modifiableTables = tables.filter((table) => {
      // User tables (non-system) can always be modified
      if (!table.isSystem) return true;
      // System tables can only be modified if explicitly allowed
      return isSystemTableModifiable(table.name || table.table_name);
    });

    // Filter out system tables for data sidebar
    const nonSystemTables = tables.filter((table) => !table.isSystem);

    // Register modifiable tables in collections sidebar (if parent exists)
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

    // Register non-system tables in data menu (if found)
    if (dataParentId) {
      const { getRouteForTableName } = useRoutes();
      const routes = useState<any[]>('routes:all', () => []);

      nonSystemTables.forEach((table) => {
        const tableName = table.name || table.table_name;
        if (!tableName) return;

        // Get the dynamic route for this table
        const dynamicRoute = getRouteForTableName(tableName);

        // Check if the route exists and is enabled
        const routeExists = routes.value.some((route: any) =>
          route.path === dynamicRoute && route.isEnabled !== false
        );

        // Only register menu if route exists and is enabled
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

  // Extension menu registration functions (from useMenuRegistry)
  const reregisterExtensionMenus = async () => {
    // Clear existing extension menu items
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

    // Registration functions
    registerMenuItem,
    registerMiniSidebar,
    unregisterMenuItem,
    unregisterMiniSidebar,

    // Utility functions
    getMenuItemsBySidebar,
    clearAllMenus,
    registerAllMenusFromApi,
    reregisterAllMenus,

    // Table and Extension functions
    registerTableMenusWithSidebarIds,
    reregisterExtensionMenus,
  };
}
