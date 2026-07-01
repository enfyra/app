import type { MenuApiItem } from '~/types';
import { EXTENSION_MENU_METADATA_FIELDS, prefixFields } from '~/utils/extension-fields';
import { compareMenuOrder } from '~/utils/menu-order';

const MENU_DEFINITION_FIELDS = "*,parent.*,sidebar.*";
const MENU_DEFINITION_FIELDS_WITH_EXTENSIONS = `${MENU_DEFINITION_FIELDS},${prefixFields("extension", EXTENSION_MENU_METADATA_FIELDS)}`;

type FetchMenuDefinitionsOptions = {
  includeExtensions?: boolean;
  showSidebarSkeleton?: boolean;
};

export const useMenuApi = () => {
  const sharedMenuDefinitionsBase = useState<{ data: MenuApiItem[] } | null>("menu-definitions", () => null);
  const sharedMenuDefinitionsWithExtensions = useState<{ data: MenuApiItem[] } | null>("menu-definitions-with-extensions", () => null);
  const sharedMenuDefinitionsPending = useState<boolean>("menu-definitions-pending", () => false);
  const sharedMenuDefinitionsSidebarPendingCount = useState<number>("menu-definitions-sidebar-pending-count", () => 0);
  const menuDefinitionFields = useState<string>("menu-definitions-fields", () => MENU_DEFINITION_FIELDS);

  const {
    data: menuDefinitions,
    pending: menuDefinitionsPending,
    execute: fetchMenuDefinitions,
  } = useApi<{ data: MenuApiItem[] }>(() => "/enfyra_menu", {
    query: computed(() => ({
      limit: 0,
      fields: menuDefinitionFields.value,
      sort: "order,label,path,id",
    })),
    errorContext: "Fetch Menu Definitions",
  });

  const wrappedFetchMenuDefinitions = async (options: FetchMenuDefinitionsOptions = {}) => {
    const includeExtensions = options.includeExtensions === true;
    const showSidebarSkeleton = options.showSidebarSkeleton !== false;
    menuDefinitionFields.value = options.includeExtensions
      ? MENU_DEFINITION_FIELDS_WITH_EXTENSIONS
      : MENU_DEFINITION_FIELDS;

    if (showSidebarSkeleton) {
      sharedMenuDefinitionsSidebarPendingCount.value += 1;
      sharedMenuDefinitionsPending.value = true;
    }

    try {
      const result = await fetchMenuDefinitions();
      if (result && menuDefinitions.value) {
        if (includeExtensions) {
          sharedMenuDefinitionsWithExtensions.value = menuDefinitions.value;
        } else {
          sharedMenuDefinitionsBase.value = menuDefinitions.value;
        }
      }
      return result;
    } finally {
      if (showSidebarSkeleton) {
        sharedMenuDefinitionsSidebarPendingCount.value = Math.max(0, sharedMenuDefinitionsSidebarPendingCount.value - 1);
        sharedMenuDefinitionsPending.value = sharedMenuDefinitionsSidebarPendingCount.value > 0;
      }
    }
  };

  const finalMenuDefinitions = computed(() =>
    sharedMenuDefinitionsWithExtensions.value || sharedMenuDefinitionsBase.value || menuDefinitions.value
  );
  const finalPending = computed(() => sharedMenuDefinitionsPending.value);

  const getDropdownMenus = computed<MenuApiItem[]>(() => {
    const dropdownMenus = finalMenuDefinitions.value?.data || [];
    return dropdownMenus
      .filter((menu: MenuApiItem) => menu.type === "Dropdown Menu" && menu.isEnabled)
      .sort(compareMenuOrder);
  });

  const getMenus = computed<MenuApiItem[]>(() => {
    const menus = finalMenuDefinitions.value?.data || [];
    return menus
      .filter((menu: MenuApiItem) => menu.type === "Menu" && menu.isEnabled)
      .sort(compareMenuOrder);
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
        .sort(compareMenuOrder);
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
