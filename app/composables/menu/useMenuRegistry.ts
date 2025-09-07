export function useMenuRegistry() {
  const menuItems = useState<MenuItem[]>("menu-items", () => []);
  const miniSidebars = useState<MiniSidebar[]>("mini-sidebars", () => []);
  const bottomMiniSidebars = useState<MiniSidebar[]>(
    "bottom-mini-sidebars",
    () => []
  );

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

  const getMenuItemsBySidebar = (sidebarId: number) => {
    const items = menuItems.value.filter(
      (item) => item.sidebarId === sidebarId
    );
    return items;
  };

  const clearAllMenus = () => {
    menuItems.value = [];
    miniSidebars.value = [];
    bottomMiniSidebars.value = [];
  };

  // Unified function to register all menus from API response
  const registerAllMenusFromApi = async (menuDefinitions: MenuDefinition[]) => {
    if (!menuDefinitions || menuDefinitions.length === 0) return;

    // FIRST: Register mini sidebars (type: "Mini Sidebar") - sorted by order
    const miniSidebarsData = menuDefinitions
      .filter((item) => item.type === "Mini Sidebar" && item.isEnabled)
      .sort((a, b) => a.order - b.order);

    if (miniSidebarsData.length > 0) {
      const sidebarsToRegister = miniSidebarsData.map((sidebar) => ({
        id: sidebar.id.toString(),
        label: sidebar.label,
        icon: sidebar.icon,
        route: sidebar.path,
        permission: sidebar.permission || undefined,
        position: "top" as const, // Default to top for API registered sidebars
      }));
      registerMiniSidebar(sidebarsToRegister);
    }

    // SECOND: Register dropdown menus (type: "Dropdown Menu") - sorted by order
    const dropdownMenusData = menuDefinitions
      .filter((item) => item.type === "Dropdown Menu" && item.isEnabled)
      .sort((a, b) => a.order - b.order);

    if (dropdownMenusData.length > 0) {
      dropdownMenusData.forEach((item) => {
        // Dropdown menus must have a sidebar
        const sidebarId = item.sidebar?.id;
        if (sidebarId) {
          // Copy entire API object to registry for full compatibility
          registerMenuItem({
            ...item,
            id: item.id.toString(),
            sidebarId: sidebarId,
            route: item.path || "", // Dropdown menus don't have path, use empty string
          } as any);
        }
      });
    }

    // THIRD: Register regular menu items (type: "Menu") - after sidebars and dropdowns are registered, sorted by order
    const regularMenuItems = menuDefinitions
      .filter((item) => item.type === "Menu" && item.isEnabled)
      .sort((a, b) => a.order - b.order);

    if (regularMenuItems.length > 0) {
      regularMenuItems.forEach((item) => {
        // item.sidebar.id is the ID of the sidebar this menu belongs to
        const sidebarId = item.sidebar?.id;
        if (sidebarId) {
          // Copy entire API object to registry for full compatibility
          registerMenuItem({
            ...item,
            id: item.id.toString(),
            sidebarId: sidebarId,
            route: item.path, // Keep both path and route for compatibility
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

  // Function to find sidebar ID by path
  const findSidebarIdByPath = (path: string): number | null => {
    // Look through registered mini sidebars to find one with matching route
    const sidebar =
      miniSidebars.value.find((s) => s.route === path) ||
      bottomMiniSidebars.value.find((s) => s.route === path);

    if (sidebar) {
      return parseInt(sidebar.id);
    }

    // If not found in mini sidebars, check if there are any registered menu items
    // that might indicate the sidebar structure
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

    // Find the collections and data sidebar IDs dynamically
    const collectionsSidebarId = findSidebarIdByPath("/collections");
    const dataSidebarId = findSidebarIdByPath("/data");

    // If we can't find the sidebars, don't register table menus
    if (!collectionsSidebarId) {
      console.warn(
        "Collections sidebar not found, skipping table menu registration"
      );
      return;
    }

    // Filter tables that can be modified in collections
    const modifiableTables = tables.filter((table) => {
      // User tables (non-system) can always be modified
      if (!table.isSystem) return true;
      // System tables can only be modified if explicitly allowed
      return isSystemTableModifiable(table.name || table.table_name);
    });

    // Filter out system tables for data sidebar
    const nonSystemTables = tables.filter((table) => !table.isSystem);

    // Register modifiable tables in collections sidebar
    modifiableTables.forEach((table) => {
      const tableName = table.name || table.table_name;
      if (!tableName) return;

      registerMenuItem({
        id: `collections-${tableName}`,
        label: table.label || table.display_name || tableName,
        route: `/collections/${tableName}`,
        icon: table.icon || "lucide:table",
        sidebarId: collectionsSidebarId,
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

    // Register non-system tables in data sidebar (if found)
    if (dataSidebarId) {
      nonSystemTables.forEach((table) => {
        const tableName = table.name || table.table_name;
        if (!tableName) return;
        registerMenuItem({
          id: `data-${tableName}`,
          label: table.label || table.display_name || tableName,
          route: `/data/${tableName}`,
          icon: table.icon || "lucide:database",
          sidebarId: dataSidebarId,
        });
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
