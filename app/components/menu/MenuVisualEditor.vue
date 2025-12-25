<script setup lang="ts">
import type { MenuDefinition, MenuTreeItem, DragEvent } from '~/utils/types/menu';
import MenuVisualEditorItem from './MenuVisualEditorItem.vue';
import draggable from 'vuedraggable';

const props = defineProps<{
  menus: MenuDefinition[];
  loading?: boolean;
}>();

const emit = defineEmits<{
  'edit-menu': [menu: MenuDefinition];
  'delete-menu': [menu: MenuDefinition];
  'toggle-enabled': [payload: { menu: MenuDefinition; enabled: boolean }];
  'add-child-menu': [parentMenu: MenuDefinition];
  'add-standalone-menu': [];
  'edit-extension': [menu: MenuDefinition];
  'delete-extension': [menu: MenuDefinition];
  'reorder-menus': [menus: MenuDefinition[]];
  'move-menu': [menu: MenuDefinition];
  'move-menu-to': [payload: { menu: MenuDefinition; newParent: MenuDefinition | null }];
}>();

const { getId } = useDatabase();

function buildChildren(parentId: string | number | null, allMenus: MenuDefinition[]): MenuTreeItem[] {
  if (!parentId) return [];
  
  const children = allMenus
    .filter(menu => {
      const menuParentId = getId(menu.parent);
      return menuParentId && String(menuParentId) === String(parentId);
    })
    .map(menu => ({
      ...menu,
      id: String(getId(menu)),
      isDropdown: menu.type === 'Dropdown Menu',
      children: buildChildren(getId(menu), allMenus)
    }))
    .sort((a, b) => (a.order || 0) - (b.order || 0));
  
  return children;
}

const menuTree = computed<MenuTreeItem[]>(() => {
  const allMenus = [...props.menus];
  
  const rootMenus = allMenus
    .filter(menu => {
      const parentId = getId(menu.parent);
      return !parentId;
    })
    .map(menu => ({
      ...menu,
      id: String(getId(menu)),
      isDropdown: menu.type === 'Dropdown Menu',
      children: buildChildren(getId(menu), allMenus)
    }))
    .sort((a, b) => (a.order || 0) - (b.order || 0));
  
  return rootMenus;
});

const menuTreeItems = ref<MenuTreeItem[]>(menuTree.value);

watch(menuTree, (newTree) => {
  menuTreeItems.value = newTree;
}, { deep: true });

const isDragging = useState('menu-dragging', () => false);

function handleRootDragStart() {
  isDragging.value = true;
}

function handleRootDragEnd() {
  setTimeout(() => {
    isDragging.value = false;
  }, 100);
}

const movingMenuId = useState<string | number | null>('moving-menu-id', () => null);

function handleMoveMenu(menu: MenuDefinition) {
  movingMenuId.value = getId(menu);
}

const canMoveToRoot = computed(() => {
  if (!movingMenuId.value) return false;
  
  const movingMenu = props.menus.find(m => String(getId(m)) === String(movingMenuId.value));
  if (!movingMenu) return false;
  
  const currentParentId = getId(movingMenu.parent);
  return currentParentId !== null;
});

function handleMoveToRoot() {
  if (!movingMenuId.value) return;
  
  const movingMenu = props.menus.find(m => String(getId(m)) === String(movingMenuId.value));
  if (!movingMenu) return;
  
  emit('move-menu-to', {
    menu: movingMenu,
    newParent: null
  });
  
  movingMenuId.value = null;
}

function handleRootReorder(event: DragEvent) {
  if (!event.moved) return;
  
  console.log('[handleRootReorder] Event:', event);
  console.log('[handleRootReorder] Root items:', menuTreeItems.value.map((item, idx) => ({
    id: getId(item),
    label: item.label,
    index: idx,
    currentOrder: props.menus.find(m => String(getId(m)) === String(getId(item)))?.order
  })));
  
  const updatedMenus: MenuDefinition[] = [];
  
  menuTreeItems.value.forEach((item, index) => {
    const itemMenuId = getId(item);
    if (!itemMenuId) return;
    
    const originalMenu = props.menus.find(m => String(getId(m)) === String(itemMenuId));
    if (!originalMenu) return;
    
    const oldOrder = originalMenu.order;
    if (oldOrder !== index) {
      console.log(`[handleRootReorder] Menu ${itemMenuId} (${originalMenu.label}): oldOrder=${oldOrder}, newOrder=${index}`);
      updatedMenus.push({
        ...originalMenu,
        order: index
      });
    }
  });
  
  console.log('[handleRootReorder] Updated menus:', updatedMenus.map(m => ({
    id: getId(m),
    label: m.label,
    order: m.order
  })));
  
  if (updatedMenus.length > 0) {
    emit('reorder-menus', updatedMenus);
  }
}


</script>

<template>
  <div class="menu-visual-editor overflow-hidden">
    <div v-if="menuTree.length === 0" class="flex flex-col items-center justify-center py-12 text-center">
      <UIcon name="lucide:navigation" class="w-12 h-12 text-gray-400 mb-3" />
      <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">No menu items available</p>
    </div>
    
    <div v-else class="space-y-4">
      <div class="menu-preview-container">
      <div class="menu-preview bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
        <div
          v-if="canMoveToRoot"
          class="mb-2 p-2 border-2 border-dashed border-blue-400 dark:border-blue-500 rounded-lg bg-blue-50 dark:bg-blue-900/20"
        >
          <UButton
            size="sm"
            color="primary"
            variant="soft"
            class="w-full"
            @click="handleMoveToRoot"
          >
            <UIcon name="lucide:move" class="w-4 h-4 mr-2" />
            Move here (Root)
          </UButton>
        </div>
        <draggable
          v-model="menuTreeItems"
          :animation="200"
          handle=".drag-handle"
          ghost-class="ghost-item"
          chosen-class="chosen-item"
          drag-class="dragging-item"
          :group="{ name: 'menu-items', pull: false, put: false }"
          @change="handleRootReorder"
          item-key="id"
          class="space-y-2"
        >
          <template #item="{ element: item }">
            <MenuVisualEditorItem
              :item="item"
              :level="0"
              :all-menus="menus"
              @edit-menu="emit('edit-menu', $event)"
              @delete-menu="emit('delete-menu', $event)"
              @toggle-enabled="emit('toggle-enabled', $event)"
              @add-child-menu="emit('add-child-menu', $event)"
              @edit-extension="emit('edit-extension', $event)"
              @delete-extension="emit('delete-extension', $event)"
              @reorder-menus="emit('reorder-menus', $event)"
              @move-menu="handleMoveMenu"
              @move-menu-to="emit('move-menu-to', $event)"
            />
          </template>
        </draggable>
      </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ghost-item {
  opacity: 0.5;
  background: rgba(59, 130, 246, 0.1);
  border: 2px dashed rgb(59, 130, 246);
}

.chosen-item {
  opacity: 0.8;
}

.dragging-item {
  opacity: 0.5;
  transform: rotate(2deg);
}

.menu-visual-editor :deep(.sortable-ghost) {
  opacity: 0.5;
  background: rgba(59, 130, 246, 0.1);
  border: 2px dashed rgb(59, 130, 246);
}

.menu-visual-editor :deep(.sortable-chosen) {
  opacity: 0.8;
}

.menu-visual-editor :deep(.sortable-drag) {
  opacity: 0.5;
  transform: rotate(2deg);
}
</style>