<script setup lang="ts">
import type { ColumnDef } from '@tanstack/vue-table';
import type { MenuDefinition } from '~/types';
import type { DataTableRowAction } from '~/types/data-table-columns';
import type { ExtensionDefinition } from '~/types/extensions';
import type { FeatureCollection } from '~/types/feature-api';
import type { PanelSection } from '~/types/ui';
import { settingsStatusColumn, settingsTextColumn } from '~/utils/settings-table';

const { register: registerHeaderActions } = useHeaderActionRegistry();

const notify = useNotify();
const { confirm } = useConfirm();
const route = useRoute();
const router = useRouter();
const tableName = "enfyra_menu";
const { ensureSchema, generateEmptyForm } = useSchema(tableName);
const { routes, ensureRoutesLoaded } = useRoutes();
const { getId } = useDatabase();
const { getLoader: getExtensionLoader } = useKeyedLoaders();
const { checkPermissionCondition } = usePermissions();
const { invalidateExtensionCache } = useDynamicComponent();
const { loadGlobalExtensions } = useGlobalExtensions();

const { execute: updateMenuApi, error: updateMenuError } = useApi(() => '/enfyra_menu', {
  method: 'patch',
  errorContext: 'Update Menu Order',
});
const { execute: reorderMenusApi, error: reorderMenusError } = useApi(() => '/admin/menu/reorder', {
  method: 'post',
  errorContext: 'Reorder Menus',
});

const isDndUpdating = useState('menu-dnd-updating', () => false);
const pendingReorderMenus = ref<MenuDefinition[]>([]);
const pageMenusLoading = ref(true);
let reorderMenusTimer: ReturnType<typeof setTimeout> | null = null;

const panelSections: PanelSection[] = [
  {
    label: 'Menus',
    value: 'menus',
    icon: 'lucide:menu',
    title: 'Menu Manager',
    description: 'Configure and manage navigation menus visually',
  },
  {
    label: 'Extensions',
    value: 'extensions',
    icon: 'lucide:puzzle',
    title: 'Extension Manager',
    description: 'Manage dynamic pages, widgets, and global shell extensions',
  },
];

const activeTab = ref<'menus' | 'extensions'>('menus');

const extensionPage = ref(1);
const extensionLimit = useSettingsPageSize('extensions');
const { searchQuery, searchValue, searchFilter, submitSearch } = useSettingsQuickSearch('name', () => fetchExtensions());

const {
  data: extensionsApiData,
  pending: extensionsLoading,
  execute: fetchExtensions,
} = useApi<FeatureCollection<ExtensionDefinition>>(() => "/enfyra_extension", {
  query: computed(() => ({
    fields: EXTENSION_LIST_FIELDS,
    limit: extensionLimit,
    page: extensionPage.value,
    meta: "*",
    ...(searchFilter.value && { filter: { _and: [searchFilter.value] } }),
    sort: ["id"].join(","),
  })),
  errorContext: "Fetch Extensions",
});

const {
  items: extensions,
  showInitialLoading: showExtensionsInitialLoading,
} = useStableListState(() => extensionsApiData.value?.data, () => extensionsLoading.value);
const extensionsTotal = computed(() =>
  searchValue.value
    ? extensionsApiData.value?.meta?.filterCount ?? 0
    : extensionsApiData.value?.meta?.totalCount ?? 0,
);

const { execute: updateExtension, error: updateExtensionError } = useApi(
  () => `/enfyra_extension`,
  {
    method: "patch",
    errorContext: "Update Extension",
  },
);

const { execute: deleteExtensionRecordApi, error: deleteExtensionRecordError } = useApi(
  () => `/enfyra_extension`,
  {
    method: "delete",
    errorContext: "Delete Extension",
  },
);

function getExtensionTypeLabel(type: string) {
  switch (type) {
    case "page":
      return "Page";
    case "widget":
      return "Widget";
    case "global":
      return "Global";
    default:
      return "Unknown";
  }
}

const extensionColumns: ColumnDef<ExtensionDefinition>[] = [
  settingsTextColumn('name', 'Extension'),
  settingsTextColumn('description', 'Description'),
  { accessorKey: 'type', header: 'Type', enableSorting: false, cell: ({ getValue }) => getExtensionTypeLabel(String(getValue())) },
  { id: 'route', header: 'Route', enableSorting: false, cell: ({ row }) => row.original.menu?.path || '_' },
  settingsStatusColumn(),
];

function getExtensionRowActions(extension: ExtensionDefinition): DataTableRowAction<ExtensionDefinition>[] {
  return [
    ...(checkPermissionCondition({ or: [{ route: '/enfyra_extension', methods: ['PATCH'] }] }) ? [{
      label: extension.isEnabled ? 'Disable' : 'Enable',
      icon: extension.isEnabled ? 'lucide:power-off' : 'lucide:power',
      disabled: getExtensionLoader(String(getId(extension) ?? '')).isLoading.value,
      onSelect: () => toggleExtensionStatus(extension),
    }] : []),
    ...(checkPermissionCondition({ or: [{ route: '/enfyra_extension', methods: ['DELETE'] }] }) && !extension.isSystem ? [{
      label: 'Delete',
      icon: 'lucide:trash-2',
      color: 'error',
      onSelect: () => deleteExtensionFromList(extension),
    }] : []),
  ];
}

const toggleExtensionStatus = async (extension: ExtensionDefinition) => {
  const loader = getExtensionLoader(String(getId(extension) ?? ''));
  const newStatus = !extension.isEnabled;

  if (extensionsApiData.value?.data) {
    const current = extensionsApiData.value.data.find(e => e.id === extension.id);
    if (current) current.isEnabled = newStatus;
  }

  await loader.withLoading(() =>
    updateExtension({
      body: {
        isEnabled: newStatus,
      },
      ...(extension.id === undefined ? {} : { id: extension.id }),
    }),
  );

  if (updateExtensionError.value) {
    if (extensionsApiData.value?.data) {
      const current = extensionsApiData.value.data.find(e => e.id === extension.id);
      if (current) current.isEnabled = !newStatus;
    }
    return;
  }

  notify.success("Success", `Extension "${extension.name}" has been ${
    newStatus ? "activated" : "deactivated"
  } successfully!`);
  invalidateExtensionCache({
    reason: "status",
    id: getId(extension),
    ...(extension.extensionId === undefined ? {} : { extensionId: extension.extensionId }),
    path: extension.menu?.path ?? null,
  });
  await loadGlobalExtensions({ forceReload: true });
};

const bulkDeleteExtensions = useSettingsBulkDelete<ExtensionDefinition>({
  path: '/enfyra_extension',
  title: 'Delete Extensions',
  isEligible: extension => !extension.isSystem,
  isBusy: () => extensions.value.some(item => getExtensionLoader(String(getId(item) ?? '')).isLoading.value),
  refresh: () => fetchExtensions(),
  onDeleted: async (deleted) => {
    for (const extension of deleted) {
      invalidateExtensionCache({ reason: 'deleted', id: getId(extension), ...(extension.extensionId === undefined ? {} : { extensionId: extension.extensionId }), path: extension.menu?.path ?? null });
    }
    await fetchMenuDefinitions();
    await refreshMenus();
    await loadGlobalExtensions({ forceReload: true });
  },
});

const deleteExtensionFromList = async (extension: ExtensionDefinition) => {
  const extensionLabel = extension.name || extension.description || String(extension.id ?? "this extension");
  const isConfirmed = await confirm({
    title: "Delete Extension",
    content: `Are you sure you want to delete "${extensionLabel}"? This action cannot be undone.`,
    confirmText: "Delete",
    cancelText: "Cancel",
  });

  if (isConfirmed) {
    await deleteExtensionRecordApi(extension.id === undefined ? {} : { id: extension.id });

    if (deleteExtensionRecordError.value) {
      return;
    }

    await fetchExtensions();
    await fetchMenuDefinitions();
    await refreshMenus();
    invalidateExtensionCache({
      reason: "deleted",
      id: getId(extension),
      ...(extension.extensionId === undefined ? {} : { extensionId: extension.extensionId }),
      path: extension.menu?.path ?? null,
    });
    await loadGlobalExtensions({ forceReload: true });

    notify.success("Success", `Extension "${extensionLabel}" has been deleted successfully!`);
  }
};

async function setExtensionPageSize(size: number) {
  if (extensionPage.value !== 1) {
    await navigateTo({ path: route.path, query: { ...route.query, page: undefined } }, { replace: true });
  }
  extensionLimit.value = size;
}

onBeforeUnmount(() => {
  if (reorderMenusTimer) {
    clearTimeout(reorderMenusTimer);
    reorderMenusTimer = null;
  }
});

const { menuDefinitions, fetchMenuDefinitions } = useMenuApi();

onMounted(() => {
  void refreshMenus();
});

const menus = computed(() => {
  const rawMenus = menuDefinitions?.value?.data || [];
  return rawMenus
    .map((menu: any) => ({
      ...menu,
      id: getId(menu),
      _id: String(getId(menu)),
    })) as MenuDefinition[];
});

const showEditModal = ref(false);
const selectedMenu = ref<MenuDefinition | null>(null);
const menuItemEditorRef = ref();
const showExtensionDrawer = ref(false);
const selectedMenuForExtension = ref<MenuDefinition | null>(null);
const drawerHistoryEntry = ref(false);
const isClearingDrawerQuery = ref(false);
let isSwitchingDrawerFromAction = false;

function queryValue(value: unknown): string | null {
  if (Array.isArray(value)) {
    return value[0] ? String(value[0]) : null;
  }

  return value == null ? null : String(value);
}

function createChildMenuDraft(parentMenu: MenuDefinition): MenuDefinition {
  const newMenu = generateEmptyForm();
  newMenu.type = 'Menu';
  const parentId = getId(parentMenu);
  newMenu.parent = parentId ? { id: parentId } : null;
  newMenu.path = buildPathFromParentChain(parentMenu, menus.value);
  return newMenu as MenuDefinition;
}

function getDrawerBaseQuery() {
  const query = { ...route.query };
  delete query.menuDrawer;
  delete query.menuId;
  delete query.parentMenuId;
  delete query.extensionDrawer;
  delete query.extensionMenuId;
  return query;
}

function findMenuById(id: unknown) {
  const targetId = queryValue(id);
  if (!targetId) return null;
  return menus.value.find((menu) => String(getId(menu)) === targetId) || null;
}

async function openDrawerQuery(query: Record<string, any>) {
  drawerHistoryEntry.value = true;
  await router.push({ query: { ...getDrawerBaseQuery(), ...query } });
}

async function clearDrawerQuery() {
  if (isClearingDrawerQuery.value) return;
  isClearingDrawerQuery.value = true;
  try {
    if (drawerHistoryEntry.value) {
      drawerHistoryEntry.value = false;
      router.back();
      return;
    }

    await router.replace({ query: getDrawerBaseQuery() });
  } finally {
    await nextTick();
    isClearingDrawerQuery.value = false;
  }
}

async function openCreateMenuDrawer() {
  isSwitchingDrawerFromAction = true;
  selectedMenu.value = null;
  showExtensionDrawer.value = false;
  selectedMenuForExtension.value = null;
  showEditModal.value = true;
  try {
    await openDrawerQuery({ menuDrawer: 'create' });
  } finally {
    await nextTick();
    isSwitchingDrawerFromAction = false;
  }
}

async function openEditMenuDrawer(menu: MenuDefinition) {
  const menuId = getId(menu);
  isSwitchingDrawerFromAction = true;
  selectedMenu.value = menu;
  showExtensionDrawer.value = false;
  selectedMenuForExtension.value = null;
  showEditModal.value = true;
  try {
    await openDrawerQuery({ menuDrawer: 'edit', menuId: menuId ? String(menuId) : undefined });
  } finally {
    await nextTick();
    isSwitchingDrawerFromAction = false;
  }
}

async function openChildMenuDrawer(parentMenu: MenuDefinition) {
  await ensureSchema();
  const parentId = getId(parentMenu);
  isSwitchingDrawerFromAction = true;
  selectedMenu.value = createChildMenuDraft(parentMenu);
  showExtensionDrawer.value = false;
  selectedMenuForExtension.value = null;
  showEditModal.value = true;
  try {
    await openDrawerQuery({
      menuDrawer: 'create',
      parentMenuId: parentId ? String(parentId) : undefined,
    });
  } finally {
    await nextTick();
    isSwitchingDrawerFromAction = false;
  }
}

async function openExtensionDrawer(menu: MenuDefinition) {
  const menuId = getId(menu);
  isSwitchingDrawerFromAction = true;
  selectedMenuForExtension.value = menu;
  showEditModal.value = false;
  selectedMenu.value = null;
  showExtensionDrawer.value = true;
  try {
    await openDrawerQuery({
      extensionDrawer: 'edit',
      extensionMenuId: menuId ? String(menuId) : undefined,
    });
  } finally {
    await nextTick();
    isSwitchingDrawerFromAction = false;
  }
}

function syncDrawersFromQuery() {
  const menuDrawer = queryValue(route.query.menuDrawer);
  const extensionDrawer = queryValue(route.query.extensionDrawer);

  if (menuDrawer === 'create') {
    const parentMenuId = queryValue(route.query.parentMenuId);
    const parentMenu = findMenuById(parentMenuId);
    if (parentMenuId && !parentMenu) return;
    selectedMenu.value = parentMenu ? createChildMenuDraft(parentMenu) : null;
    showExtensionDrawer.value = false;
    selectedMenuForExtension.value = null;
    showEditModal.value = true;
    return;
  }

  if (menuDrawer === 'edit') {
    const menu = findMenuById(route.query.menuId);
    if (!menu) return;
    selectedMenu.value = menu;
    showExtensionDrawer.value = false;
    selectedMenuForExtension.value = null;
    showEditModal.value = true;
    return;
  }

  if (extensionDrawer === 'edit') {
    const menu = findMenuById(route.query.extensionMenuId);
    if (!menu) return;
    selectedMenuForExtension.value = menu;
    showEditModal.value = false;
    selectedMenu.value = null;
    showExtensionDrawer.value = true;
    return;
  }

  showEditModal.value = false;
  selectedMenu.value = null;
  showExtensionDrawer.value = false;
  selectedMenuForExtension.value = null;
}

registerHeaderActions([
  useReloadAction({
    reload: () => activeTab.value === 'extensions' ? fetchExtensions() : refreshMenus(),
    loading: computed(() => activeTab.value === 'extensions' ? extensionsLoading.value : pageMenusLoading.value),
  }),
  {
    id: "create-menu",
    label: "Create Menu",
    icon: "lucide:plus",
    variant: "solid",
    color: "primary",
    size: "md",
    show: computed(() => activeTab.value === 'menus'),
    onClick: async () => {
      if (showEditModal.value && menuItemEditorRef.value?.hasFormChanges) {
        const isConfirmed = await confirm({
          title: "Discard Changes?",
          content: "You have unsaved changes. Are you sure you want to close? All changes will be lost.",
          confirmText: "Discard",
          cancelText: "Cancel",
        });
        
        if (!isConfirmed) {
          return;
        }
      }
      await openCreateMenuDrawer();
    },
    permission: {
      and: [
        {
          route: "/enfyra_menu",
          methods: ["POST"],
        },
      ],
    },
  },
  {
    id: "create-extension",
    label: "Create Extension",
    icon: "lucide:plus",
    variant: "solid",
    color: "primary",
    size: "md",
    to: "/settings/extensions/create",
    show: computed(() => activeTab.value === 'extensions'),
    permission: {
      and: [
        {
          route: "/enfyra_extension",
          methods: ["POST"],
        },
      ],
    },
  },
]);

const { menuItems, reregisterAllMenus, registerDataMenuItemsFromRoutes } = useMenuRegistry();

async function refreshMenus() {
  const fetchMenusWithExtensions = () => fetchMenuDefinitions({ includeExtensions: true, showSidebarSkeleton: false });
  pageMenusLoading.value = true;
  try {
    await reregisterAllMenus?.(fetchMenusWithExtensions as any);
    await ensureRoutesLoaded?.();
    registerDataMenuItemsFromRoutes?.(routes.value);
  } finally {
    pageMenusLoading.value = false;
  }
}

async function handleEditMenu(menu: MenuDefinition) {
  await openEditMenuDrawer(menu);
}

function buildPathFromParentChain(menu: MenuDefinition, allMenus: MenuDefinition[]): string {
  const pathParts: string[] = [];
  
  function traverseUp(currentMenu: MenuDefinition) {
    if (currentMenu.path && currentMenu.path !== '/') {
      const parts = currentMenu.path.split('/').filter(Boolean);
      if (parts.length > 0) {
        pathParts.unshift(...parts);
      }
    }
    
    if (currentMenu.parent) {
      const parentId = getId(currentMenu.parent);
      if (parentId) {
        const parent = allMenus.find(m => String(getId(m)) === String(parentId));
        if (parent) {
          traverseUp(parent);
        }
      }
    }
  }
  
  traverseUp(menu);
  
  if (pathParts.length > 0) {
    return '/' + pathParts.join('/') + '/';
  }
  
  return '/';
}

async function handleAddChildMenu(parentMenu: MenuDefinition) {
  await openChildMenuDrawer(parentMenu);
}

async function handleAddStandaloneMenu() {
  if (showEditModal.value && menuItemEditorRef.value?.hasFormChanges) {
    const isConfirmed = await confirm({
      title: "Discard Changes?",
      content: "You have unsaved changes. Are you sure you want to close? All changes will be lost.",
      confirmText: "Discard",
      cancelText: "Cancel",
    });
    
    if (!isConfirmed) {
      return;
    }
  }
  await openCreateMenuDrawer();
}

async function handleSaveMenu() {
  await refreshMenus();
  showEditModal.value = false;
  selectedMenu.value = null;
  await clearDrawerQuery();
}

async function toggleEnabled(payload: { menu: MenuDefinition; enabled: boolean }) {
  const menuItem = payload.menu;
  const enabled = payload.enabled;
  if (menuItem.isSystem) return;
  
  const newEnabled = enabled;
  const originalEnabled = menuItem.isEnabled;
  const menuId = getId(menuItem);

  const rawMenus = menuDefinitions.value?.data || [];
  const menuIndex = rawMenus.findIndex(
    (m: any) => String(getId(m)) === String(menuId)
  );
  
  const registryMenuIndex = menuItems.value.findIndex(
    (m: any) => String(m.id) === String(menuId)
  );

  if (menuIndex !== -1 && menuDefinitions.value?.data) {
    menuDefinitions.value.data[menuIndex]!.isEnabled = newEnabled;
  }

  if (registryMenuIndex !== -1) {
    menuItems.value[registryMenuIndex]!.isEnabled = newEnabled;
  }

  const { execute: updateSpecificMenu, error: updateError } = useApi(
    () => `/enfyra_menu/${menuId}`,
    {
      method: "patch",
      errorContext: "Toggle Menu",
    }
  );

  await updateSpecificMenu({ body: { isEnabled: newEnabled } });

  if (updateError.value) {
    if (menuIndex !== -1 && menuDefinitions.value?.data) {
      menuDefinitions.value.data[menuIndex]!.isEnabled = originalEnabled;
    }
    if (registryMenuIndex !== -1) {
      menuItems.value[registryMenuIndex]!.isEnabled = originalEnabled;
    }
    await refreshMenus();
    return;
  }

  await refreshMenus();

  notify.success("Success", `Menu ${newEnabled ? "enabled" : "disabled"} successfully`);
}

async function deleteMenu(menuItem: MenuDefinition) {
  if (menuItem.isSystem) {
    notify.error("Cannot Delete", "System menus cannot be deleted");
    return;
  }

  const menuName = menuItem.label || menuItem.description || menuItem.path || "this menu";

  const isConfirmed = await confirm({
    title: "Delete Menu",
    content: `Are you sure you want to delete menu "${menuName}"? This action cannot be undone.`,
    confirmText: "Delete",
    cancelText: "Cancel",
  });

  if (isConfirmed) {
    const { execute: deleteMenuApi, error: deleteError } = useApi(
      () => `/enfyra_menu/${getId(menuItem)}`,
      {
        method: "delete",
        errorContext: "Delete Menu",
      }
    );

    await deleteMenuApi();

    if (deleteError.value) {
      return;
    }

    await refreshMenus();

    notify.success("Success", `Menu "${menuName}" has been deleted successfully!`);
  }
}

async function handleEditExtension(menu: MenuDefinition) {
  await openExtensionDrawer(menu);
}

async function handleSaveExtension() {
  await Promise.all([refreshMenus(), fetchExtensions()]);
  showExtensionDrawer.value = false;
  selectedMenuForExtension.value = null;
  await clearDrawerQuery();
}

async function handleDeleteExtension(menu: MenuDefinition) {
  if (!menu.extension) return;

  const extensionId = getId(menu.extension);
  if (!extensionId) return;

  const isConfirmed = await confirm({
    title: "Delete Extension",
    content: `Are you sure you want to delete the extension "${menu.extension.name || menu.extension.description || extensionId}"? This will permanently delete the extension and unlink it from menu "${menu.label || menu.description || menu.path || "this menu"}".`,
    confirmText: "Delete",
    cancelText: "Cancel",
  });

  if (!isConfirmed) return;

  const { execute: deleteExtensionApi, error: deleteError } = useApi(
    () => `/enfyra_extension/${extensionId}`,
    {
      method: "delete",
      errorContext: "Delete Extension",
    }
  );

  await deleteExtensionApi();

  if (deleteError.value) {
    return;
  }

  await Promise.all([refreshMenus(), fetchExtensions()]);
  invalidateExtensionCache({
    reason: "deleted",
    id: extensionId,
    ...(menu.extension.extensionId === undefined ? {} : { extensionId: menu.extension.extensionId }),
    path: menu.path ?? null,
  });

  notify.success("Success", `Extension deleted successfully!`);
}

async function handleMoveMenuTo(payload: { menu: MenuDefinition; newParent: MenuDefinition | null }) {
  const { menu, newParent } = payload;
  const menuId = getId(menu);
  if (!menuId) return;

  const newParentId = newParent ? getId(newParent) : null;
  const oldParentId = getId(menu.parent);
  const originalParent = menu.parent;

  if (String(oldParentId || null) === String(newParentId || null)) {
    return;
  }

  const body: { parent?: number | string | null; order?: number } = {
    parent: newParentId
  };

  if (newParentId) {
    const siblings = menus.value.filter((m: MenuDefinition) => {
      const mParentId = getId(m.parent);
      return String(mParentId || null) === String(newParentId);
    });
    body.order = siblings.length;
  } else {
    const rootSiblings = menus.value.filter((m: MenuDefinition) => {
      const mParentId = getId(m.parent);
      return !mParentId;
    });
    body.order = rootSiblings.length;
  }

  const rawMenus = menuDefinitions.value?.data || [];
  const menuIndex = rawMenus.findIndex(
    (m: any) => String(getId(m)) === String(menuId)
  );
  
  const registryMenuIndex = menuItems.value.findIndex(
    (m: any) => String(m.id) === String(menuId)
  );

  const newParentValue = newParentId ? (typeof newParentId === 'object' ? newParentId : { id: newParentId }) : null;
  const originalParentValue = originalParent ? (typeof getId(originalParent) === 'object' ? getId(originalParent) : { id: getId(originalParent) }) : null;

  if (menuIndex !== -1 && menuDefinitions.value?.data) {
    const menu = menuDefinitions.value.data[menuIndex]!;
    menu.parent = newParentValue;
  }

  if (registryMenuIndex !== -1) {
    const registryMenu = menuItems.value[registryMenuIndex]!;
    if (newParentId) {
      const parentMenu = menus.value.find(m => String(getId(m)) === String(newParentId));
      registryMenu.parent = parentMenu ? (parentMenu as any) : String(newParentId) as any;
    } else {
      delete registryMenu.parent;
    }
  }

  await updateMenuApi({
    id: menuId,
    body
  });

  if (updateMenuError.value) {
    if (menuIndex !== -1 && menuDefinitions.value?.data) {
      const menu = menuDefinitions.value.data[menuIndex]!;
      menu.parent = originalParentValue;
    }
    if (registryMenuIndex !== -1) {
      const registryMenu = menuItems.value[registryMenuIndex]!;
      if (originalParent) {
        const parentId = getId(originalParent);
        const parentMenu = menus.value.find(m => String(getId(m)) === String(parentId));
        registryMenu.parent = parentMenu ? (parentMenu as any) : String(parentId) as any;
      } else {
        delete registryMenu.parent;
      }
    }
    await refreshMenus();
    return;
  }

  await refreshMenus();

  notify.success("Success", "Menu moved successfully!");
}

function mergePendingReorderMenus(updatedMenus: MenuDefinition[]) {
  const merged = new Map<string, MenuDefinition>();
  for (const menu of pendingReorderMenus.value) {
    const menuId = getId(menu);
    if (menuId) merged.set(String(menuId), menu);
  }
  for (const menu of updatedMenus) {
    const menuId = getId(menu);
    if (menuId) merged.set(String(menuId), menu);
  }
  pendingReorderMenus.value = Array.from(merged.values());
}

function scheduleReorderFlush() {
  if (reorderMenusTimer) clearTimeout(reorderMenusTimer);
  reorderMenusTimer = setTimeout(() => {
    reorderMenusTimer = null;
    void flushReorderMenus();
  }, 0);
}

async function flushReorderMenus() {
  if (isDndUpdating.value) {
    scheduleReorderFlush();
    return;
  }

  const updatedMenus = pendingReorderMenus.value;
  pendingReorderMenus.value = [];
  if (!updatedMenus.length) return;

  const originalMenuDefinitions = menuDefinitions.value?.data ? JSON.parse(JSON.stringify(menuDefinitions.value.data)) : [];
  const originalMenuItems = JSON.parse(JSON.stringify(menuItems.value));
  const invalidSystemParentMove = updatedMenus.find((menu) => {
    if (!menu.isSystem) return false;
    const originalMenu = menus.value.find((m) => String(getId(m)) === String(getId(menu)));
    const originalParentId = getId(originalMenu?.parent);
    const nextParentId = getId((menu as any).parent);
    return String(originalParentId || null) !== String(nextParentId || null);
  });

  if (invalidSystemParentMove) {
    await refreshMenus();
    notify.warning("Cannot move system menu", "System menu parent references are locked.");
    return;
  }

  isDndUpdating.value = true;

  try {
    const updates = updatedMenus
      .map((menu) => {
        const menuId = getId(menu);
        if (!menuId) return null;
        const parentId = getId((menu as any).parent);
        return {
          id: menuId,
          order: menu.order,
          parent: parentId ? parentId : null,
        };
      })
      .filter(Boolean);

    if (menuDefinitions.value?.data) {
      const updateById = new Map(updates.map((u) => [String(u!.id), u!]));
      for (const item of menuDefinitions.value.data) {
        const patch = updateById.get(String(getId(item)));
        if (!patch) continue;
        item.order = patch.order;
        item.parent = patch.parent ? ({ id: patch.parent } as any) : null;
      }
    }

    const response = await reorderMenusApi({
      body: { updates },
    });
    if (!response || reorderMenusError.value) {
      throw reorderMenusError.value || new Error("Menu order update failed");
    }

    await refreshMenus();

    notify.success("Success", "Menu order updated successfully!");
  } catch (error) {
    if (menuDefinitions.value && originalMenuDefinitions.length > 0) {
      menuDefinitions.value.data = originalMenuDefinitions;
    }
    menuItems.value = originalMenuItems;
    await refreshMenus();
    if (!reorderMenusError.value) {
      notify.error("Error", "Failed to update menu order. Please try again.");
    }
  } finally {
    isDndUpdating.value = false;
    if (pendingReorderMenus.value.length > 0) {
      scheduleReorderFlush();
    }
  }
}

async function handleReorderMenus(updatedMenus: MenuDefinition[]) {
  if (!updatedMenus || updatedMenus.length === 0) return;
  mergePendingReorderMenus(updatedMenus);
  scheduleReorderFlush();
}

async function handleTabChange(nextTab: string | number) {
  const normalized = String(nextTab) === 'extensions' ? 'extensions' : 'menus';
  if (activeTab.value === normalized) return;
  activeTab.value = normalized;
  const nextQuery = { ...route.query };
  if (normalized === 'extensions') {
    nextQuery.tab = 'extensions';
  } else {
    delete nextQuery.tab;
    delete nextQuery.page;
    delete nextQuery.search;
  }
  await router.replace({ path: route.path, query: nextQuery });
}

watch(
  () => route.query.tab,
  (tab) => {
    activeTab.value = queryValue(tab) === 'extensions' ? 'extensions' : 'menus';
  },
  { immediate: true },
);

watch(() => route.query.page, newVal => { extensionPage.value = Math.max(1, Number(newVal) || 1); }, { immediate: true });
watch([extensionPage, extensionLimit, searchValue], () => { void fetchExtensions(); }, { immediate: true });

watch(
  () => [route.query.menuDrawer, route.query.menuId, route.query.parentMenuId, route.query.extensionDrawer, route.query.extensionMenuId, menus.value.length],
  () => syncDrawersFromQuery(),
  { immediate: true }
);

watch(showEditModal, async (isOpen, wasOpen) => {
  if (isSwitchingDrawerFromAction) return;
  if (!isOpen && wasOpen && route.query.menuDrawer) {
    selectedMenu.value = null;
    await clearDrawerQuery();
  }
});

watch(showExtensionDrawer, async (isOpen, wasOpen) => {
  if (isSwitchingDrawerFromAction) return;
  if (!isOpen && wasOpen && route.query.extensionDrawer) {
    selectedMenuForExtension.value = null;
    await clearDrawerQuery();
  }
});

</script>

<template>
  <div class="eapp-page-constrained space-y-6">
    <CommonPanel :model-value="activeTab" :sections="panelSections" @update:model-value="handleTabChange">
      <template #menus>
        <MenuVisualEditor
          :menus="menus"
          :loading="pageMenusLoading && menus.length === 0"
          @edit-menu="handleEditMenu"
          @delete-menu="deleteMenu"
          @toggle-enabled="toggleEnabled"
          @add-child-menu="handleAddChildMenu"
          @add-standalone-menu="handleAddStandaloneMenu"
          @edit-extension="handleEditExtension"
          @delete-extension="handleDeleteExtension"
          @reorder-menus="handleReorderMenus"
          @move-menu-to="handleMoveMenuTo"
        />
      </template>

      <template #extensions>
        <DataTableSettingsTable
          header-name="Extension Manager"
          v-model:page="extensionPage"
          :data="extensions"
          :bulk-action="bulkDeleteExtensions"
          :columns="extensionColumns"
          :actions="getExtensionRowActions"
          :loading="showExtensionsInitialLoading"
          :total="extensionsTotal"
          :page-limit="extensionLimit"
          page-size-key="extensions"
          :pagination-loading="extensionsLoading"
          @page-size-change="setExtensionPageSize"
          :to="(p) => ({ path: route.path, query: { ...route.query, tab: 'extensions', page: p } })"
          searchable
          v-model:search="searchQuery"
          search-placeholder="Search by name"
          search-label="Search by name"
          @search="submitSearch"
          @row-click="extension => navigateTo(`/settings/extensions/${getId(extension)}`)"
        />
      </template>
    </CommonPanel>

    <MenuItemEditor
      ref="menuItemEditorRef"
      v-model="showEditModal"
      :menu="selectedMenu"
      :all-menus="menus"
      @save="handleSaveMenu"
    />

    <ExtensionEditorDrawer
      v-model="showExtensionDrawer"
      :menu="selectedMenuForExtension"
      @save="handleSaveExtension"
    />
  </div>
</template>
