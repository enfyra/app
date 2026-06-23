<script setup lang="ts">
import type { MenuDefinition, MenuTreeItem, DragEvent } from '~/types';
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
const isDndUpdating = useState('menu-dnd-updating', () => false);

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
  const updatedMenus: MenuDefinition[] = [];
  
  menuTreeItems.value.forEach((item, index) => {
    const itemMenuId = getId(item);
    if (!itemMenuId) return;
    
    const originalMenu = props.menus.find(m => String(getId(m)) === String(itemMenuId));
    if (!originalMenu) return;

    const currentParentId = getId(originalMenu.parent) || null;
    const nextParentId = null;
    const currentOrder = originalMenu.order;
    const nextOrder = index;

    if (String(currentParentId) !== String(nextParentId) || currentOrder !== nextOrder) {
      updatedMenus.push({
        ...originalMenu,
        parent: null as any,
        order: nextOrder
      });
    }
  });

  if (updatedMenus.length > 0) emit('reorder-menus', updatedMenus);
}

function getMenuParentId(menu: MenuDefinition | MenuTreeItem | undefined | null) {
  return getId((menu as any)?.parent) || null;
}

function canDropIntoParent(event: any, targetParentId: string | number | null) {
  const dragged = event?.draggedContext?.element;
  if (!dragged?.isSystem) return true;

  const originalMenu = props.menus.find((menu) => String(getId(menu)) === String(getId(dragged)));
  const originalParentId = getMenuParentId(originalMenu);
  return String(originalParentId || null) === String(targetParentId || null);
}


</script>

<template>
  <div
    class="menu-visual-editor overflow-hidden"
    :class="isDndUpdating ? 'pointer-events-none opacity-60 select-none' : ''"
  >
    <div v-if="menuTree.length === 0" class="flex flex-col items-center justify-center py-12 text-center">
      <UIcon name="lucide:navigation" class="w-12 h-12 text-[var(--text-quaternary)] mb-3" />
      <p class="text-sm text-[var(--text-tertiary)] mb-4">No menu items available</p>
    </div>
    
    <div v-else class="menu-preview-stage">
      <div class="menu-preview surface-card">
        <div class="menu-preview-header">
          <div>
            <p class="menu-preview-kicker">Navigation preview</p>
            <h3 class="menu-preview-title">Menu structure</h3>
          </div>
          <UBadge variant="soft" color="neutral" size="sm">
            {{ menuTreeItems.length }} root
          </UBadge>
        </div>

        <div
          v-if="canMoveToRoot"
          class="mb-3 rounded-[var(--radius-panel)] border border-dashed border-[var(--badge-primary-soft-border)] bg-[var(--badge-primary-soft-bg)] p-2"
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
          :disabled="isDndUpdating"
          handle=".drag-handle"
          ghost-class="ghost-item"
          chosen-class="chosen-item"
          drag-class="dragging-item"
          :group="{ name: 'menu-items', pull: true, put: true }"
          :move="(event: any) => canDropIntoParent(event, null)"
          @change="handleRootReorder"
          item-key="id"
          class="menu-root-drop-zone"
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
</template>

<style scoped>
.menu-visual-editor {
  width: 100%;
}

.menu-preview-stage {
  width: 100%;
}

.menu-preview {
  border-radius: var(--radius-card);
  padding: 16px 18px 18px;
}

.menu-preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  padding: 4px 4px 10px;
  border-bottom: 1px solid var(--border-subtle);
}

.menu-preview-kicker {
  color: var(--text-quaternary);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.menu-preview-title {
  margin-top: 2px;
  color: var(--text-primary);
  font-size: 15px;
  font-weight: 800;
}

.menu-root-drop-zone {
  display: grid;
  gap: 8px;
}

.ghost-item {
  opacity: 0.5;
  background: color-mix(in srgb, var(--brand-500) 10%, transparent);
  border: 2px dashed var(--brand-500);
}

.chosen-item {
  opacity: 0.8;
}

.dragging-item {
  opacity: 0.5;
}

.menu-visual-editor :deep(.sortable-ghost) {
  opacity: 0.5;
  background: color-mix(in srgb, var(--brand-500) 10%, transparent);
  border: 2px dashed var(--brand-500);
}

.menu-visual-editor :deep(.sortable-chosen) {
  opacity: 0.8;
}

.menu-visual-editor :deep(.sortable-drag) {
  opacity: 0.5;
}
</style>
