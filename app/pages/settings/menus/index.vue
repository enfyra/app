<script setup lang="ts">
import type { MenuDefinition } from '~/utils/types/menu';

const toast = useToast();
const { confirm } = useConfirm();
const route = useRoute();
const tableName = "menu_definition";
const { getIncludeFields, generateEmptyForm } = useSchema(tableName);
const { schemas } = useSchema();
const { isMounted } = useMounted();
const { getId } = useDatabase();

const { registerPageHeader, clearPageHeader } = usePageHeaderRegistry();

const { execute: updateMenuApi } = useApi(() => '/menu_definition', {
  method: 'patch',
  errorContext: 'Update Menu Order',
});

registerPageHeader({
  title: "Menu Manager",
  description: "Configure and manage navigation menus visually",
  variant: "default",
  gradient: "purple",
});

onBeforeUnmount(() => {
  clearPageHeader();
});

const {
  data: apiData,
  pending: loading,
  execute: fetchMenus,
} = useApi(() => "/menu_definition", {
  query: computed(() => {
    return {
      fields: `${getIncludeFields()},extension.*,parent.*,children.*`,
      sort: "order",
      limit: 0,
    };
  }),
  errorContext: "Fetch Menus",
});

const menus = computed(() => apiData.value?.data || [] as MenuDefinition[]);

const showEditModal = ref(false);
const selectedMenu = ref<MenuDefinition | null>(null);
const menuItemEditorRef = ref();
const showExtensionDrawer = ref(false);
const selectedMenuForExtension = ref<MenuDefinition | null>(null);

useHeaderActionRegistry([
  {
    id: "create-menu",
    label: "Create Menu",
    icon: "lucide:plus",
    variant: "solid",
    color: "primary",
    size: "md",
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
      selectedMenu.value = null;
      showEditModal.value = true;
    },
    permission: {
      and: [
        {
          route: "/menu_definition",
          actions: ["create"],
        },
      ],
    },
  },
]);

const { reregisterAllMenus, registerDataMenuItems } = useMenuRegistry();
const { fetchMenuDefinitions } = useMenuApi();

async function refreshMenus() {
  await fetchMenus();
  await reregisterAllMenus(fetchMenuDefinitions as any);

  const schemaValues = Object.values(schemas.value);
  if (schemaValues.length > 0) {
    await registerDataMenuItems(schemaValues);
  }
}

function handleEditMenu(menu: MenuDefinition) {
  selectedMenu.value = menu;
  showEditModal.value = true;
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

function handleAddChildMenu(parentMenu: MenuDefinition) {
  const newMenu = generateEmptyForm();
  newMenu.type = 'Menu';
  const parentId = getId(parentMenu);
  newMenu.parent = parentId ? { id: parentId } : null;
  
  const basePath = buildPathFromParentChain(parentMenu, menus.value);
  console.log('handleAddChildMenu - parentMenu:', parentMenu);
  console.log('handleAddChildMenu - basePath:', basePath);
  newMenu.path = basePath;
  console.log('handleAddChildMenu - newMenu:', newMenu);
  
  selectedMenu.value = newMenu as MenuDefinition;
  showEditModal.value = true;
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
  const newMenu = generateEmptyForm();
  newMenu.type = 'Menu';
  selectedMenu.value = newMenu as MenuDefinition;
  showEditModal.value = true;
}

async function handleSaveMenu() {
  await refreshMenus();
  showEditModal.value = false;
  selectedMenu.value = null;
}

async function toggleEnabled(payload: { menu: MenuDefinition; enabled: boolean }) {
  const menuItem = payload.menu;
  const enabled = payload.enabled;
  if (menuItem.isSystem) return;
  
  const newEnabled = enabled;

  if (apiData.value?.data) {
    const menuIndex = apiData.value.data.findIndex(
      (m: any) => String(getId(m)) === String(getId(menuItem))
    );
    if (menuIndex !== -1) {
      apiData.value.data[menuIndex].isEnabled = newEnabled;
    }
  }

  const { execute: updateSpecificMenu, error: updateError } = useApi(
    () => `/menu_definition/${getId(menuItem)}`,
    {
      method: "patch",
      errorContext: "Toggle Menu",
    }
  );

  await updateSpecificMenu({ body: { isEnabled: newEnabled } });

  if (updateError.value) {
    if (apiData.value?.data) {
      const menuIndex = apiData.value.data.findIndex(
        (m: any) => String(getId(m)) === String(getId(menuItem))
      );
      if (menuIndex !== -1) {
        apiData.value.data[menuIndex].isEnabled = !newEnabled;
      }
    }
    return;
  }

  await refreshMenus();

  toast.add({
    title: "Success",
    description: `Menu ${newEnabled ? "enabled" : "disabled"} successfully`,
    color: "success",
  });
}

async function deleteMenu(menuItem: MenuDefinition) {
  if (menuItem.isSystem) {
    toast.add({
      title: "Cannot Delete",
      description: "System menus cannot be deleted",
      color: "error",
    });
    return;
  }

  const isConfirmed = await confirm({
    title: "Delete Menu",
    content: `Are you sure you want to delete menu "${menuItem.label}"? This action cannot be undone.`,
    confirmText: "Delete",
    cancelText: "Cancel",
  });

  if (isConfirmed) {
    const { execute: deleteMenuApi, error: deleteError } = useApi(
      () => `/menu_definition/${getId(menuItem)}`,
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

    toast.add({
      title: "Success",
      description: `Menu "${menuItem.label}" has been deleted successfully!`,
      color: "success",
    });
  }
}

function handleEditExtension(menu: MenuDefinition) {
  selectedMenuForExtension.value = menu;
  showExtensionDrawer.value = true;
}

async function handleSaveExtension() {
  await refreshMenus();
  showExtensionDrawer.value = false;
  selectedMenuForExtension.value = null;
}

async function handleDeleteExtension(menu: MenuDefinition) {
  if (!menu.extension) return;

  const extensionId = getId(menu.extension);
  if (!extensionId) return;

  const isConfirmed = await confirm({
    title: "Delete Extension",
    content: `Are you sure you want to delete the extension "${menu.extension.name || menu.extension.description || extensionId}"? This will permanently delete the extension and unlink it from menu "${menu.label}".`,
    confirmText: "Delete",
    cancelText: "Cancel",
  });

  if (!isConfirmed) return;

  const { execute: deleteExtensionApi, error: deleteError } = useApi(
    () => `/extension_definition/${extensionId}`,
    {
      method: "delete",
      errorContext: "Delete Extension",
    }
  );

  await deleteExtensionApi();

  if (deleteError.value) {
    return;
  }

  await refreshMenus();

  toast.add({
    title: "Success",
    description: `Extension deleted successfully!`,
    color: "success",
  });
}

async function handleMoveMenu(menu: MenuDefinition) {
  
}

async function handleMoveMenuTo(payload: { menu: MenuDefinition; newParent: MenuDefinition | null }) {
  const { menu, newParent } = payload;
  const menuId = getId(menu);
  if (!menuId) return;

  const newParentId = newParent ? getId(newParent) : null;
  const oldParentId = getId(menu.parent);

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

  await updateMenuApi({
    id: menuId,
    body
  });

  await refreshMenus();

  toast.add({
    title: "Success",
    description: "Menu moved successfully!",
    color: "success",
  });
}

async function handleReorderMenus(updatedMenus: MenuDefinition[]) {
  if (!updatedMenus || updatedMenus.length === 0) return;

  console.log('[handleReorderMenus] Input updatedMenus:', updatedMenus.map(m => ({
    id: getId(m),
    label: m.label,
    order: m.order,
    parent: getId(m.parent)
  })));

  const updatePromises = updatedMenus.map(async (menu) => {
    const menuId = getId(menu);
    if (!menuId) return;

    const body: { order: number } = {
      order: menu.order
    };

    console.log(`[handleReorderMenus] Updating menu ${menuId} (${menu.label}):`, body);

    await updateMenuApi({
      id: menuId,
      body
    });
  });

  try {
    await Promise.all(updatePromises);
    await refreshMenus();

    toast.add({
      title: "Success",
      description: "Menu order updated successfully!",
      color: "success",
    });
  } catch (error) {
    toast.add({
      title: "Error",
      description: "Failed to update menu order. Please try again.",
      color: "error",
    });
  }
}

onMounted(() => {
  fetchMenus();
});
</script>

<template>
  <div class="space-y-6">
    <Transition name="loading-fade" mode="out-in">
      <CommonLoadingState
        v-if="loading || !isMounted"
        type="menu"
        context="page"
      />
      
      <MenuVisualEditor
        v-else
        :menus="menus"
        :loading="false"
        @edit-menu="handleEditMenu"
        @delete-menu="deleteMenu"
        @toggle-enabled="toggleEnabled"
        @add-child-menu="handleAddChildMenu"
        @add-standalone-menu="handleAddStandaloneMenu"
        @edit-extension="handleEditExtension"
        @delete-extension="handleDeleteExtension"
        @reorder-menus="handleReorderMenus"
        @move-menu="handleMoveMenu"
        @move-menu-to="handleMoveMenuTo"
      />
    </Transition>
  </div>

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

</template>
