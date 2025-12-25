<script setup lang="ts">
import type { MenuDefinition, MenuTreeItem, DragEvent, MenuContextMenuItem } from '~/utils/types/menu';
import draggable from 'vuedraggable';

const props = defineProps<{
  item: MenuTreeItem;
  level?: number;
  allMenus?: MenuDefinition[];
}>();

const emit = defineEmits<{
  'edit-menu': [menu: MenuDefinition];
  'delete-menu': [menu: MenuDefinition];
  'toggle-enabled': [payload: { menu: MenuDefinition; enabled: boolean }];
  'add-child-menu': [parentMenu: MenuDefinition];
  'edit-extension': [menu: MenuDefinition];
  'delete-extension': [menu: MenuDefinition];
  'reorder-menus': [menus: MenuDefinition[]];
  'move-menu': [menu: MenuDefinition];
  'move-menu-to': [payload: { menu: MenuDefinition; newParent: MenuDefinition | null }];
}>();

const { getId } = useDatabase();

const childrenItems = ref<MenuTreeItem[]>(props.item.children || []);

watch(() => props.item.children, (newChildren) => {
  childrenItems.value = newChildren || [];
}, { deep: true });

function handleItemClick(menu: MenuTreeItem) {
  const originalMenu = props.allMenus?.find(m => String(getId(m)) === String(menu.id));
  if (originalMenu) {
    emit('edit-menu', originalMenu);
  }
}

function isDescendant(menuId: string | number, potentialParentId: string | number, allMenus: MenuDefinition[]): boolean {
  const menu = allMenus.find(m => String(getId(m)) === String(menuId));
  if (!menu) return false;
  
  const menuParentId = getId(menu.parent);
  if (!menuParentId) return false;
  
  if (String(menuParentId) === String(potentialParentId)) return true;
  
  return isDescendant(menuParentId, potentialParentId, allMenus);
}

function handleChildrenReorder(event: DragEvent) {
  if (!props.allMenus || !event.moved) return;
  
  const parentId = getId(props.item);
  if (!parentId) return;
  
  console.log('[handleChildrenReorder] Event:', event);
  console.log('[handleChildrenReorder] Parent ID:', parentId);
  console.log('[handleChildrenReorder] Children items:', childrenItems.value.map((c, idx) => ({
    id: getId(c),
    label: c.label,
    index: idx,
    currentOrder: props.allMenus?.find(m => String(getId(m)) === String(getId(c)))?.order
  })));
  
  const updatedMenus: MenuDefinition[] = [];
  const allMenus = props.allMenus;
  
  childrenItems.value.forEach((child: MenuTreeItem, index: number) => {
    const childMenuId = getId(child);
    if (!childMenuId) return;
    
    const originalMenu = allMenus.find(m => String(getId(m)) === String(childMenuId));
    if (!originalMenu || originalMenu.isSystem) return;
    
    const oldOrder = originalMenu.order;
    if (oldOrder !== index) {
      console.log(`[handleChildrenReorder] Menu ${childMenuId} (${originalMenu.label}): oldOrder=${oldOrder}, newOrder=${index}`);
      updatedMenus.push({
        ...originalMenu,
        order: index
      });
    }
  });
  
  console.log('[handleChildrenReorder] Updated menus:', updatedMenus.map(m => ({
    id: getId(m),
    label: m.label,
    order: m.order
  })));
  
  if (updatedMenus.length > 0) {
    emit('reorder-menus', updatedMenus);
  }
}

function getContextMenuItems(menu: MenuTreeItem): MenuContextMenuItem[][] {
  const originalMenu = props.allMenus?.find(m => String(getId(m)) === String(menu.id));
  if (!originalMenu) return [[]];
  
  const items: MenuContextMenuItem[] = [
    {
      label: 'Edit',
      icon: 'lucide:edit',
      onSelect: () => {
        if (originalMenu) emit('edit-menu', originalMenu);
      }
    },
    {
      label: originalMenu.isEnabled ? 'Disable' : 'Enable',
      icon: originalMenu.isEnabled ? 'lucide:toggle-left' : 'lucide:toggle-right',
      onSelect: () => {
        if (originalMenu) emit('toggle-enabled', { menu: originalMenu, enabled: !originalMenu.isEnabled });
      }
    }
  ];

  if (originalMenu.type === 'Dropdown Menu') {
    items.push({
      label: 'Add Child Menu',
      icon: 'lucide:plus-circle',
      onSelect: () => {
        if (originalMenu) emit('add-child-menu', originalMenu);
      }
    });
  }

  if (originalMenu.type === 'Menu') {
    if (originalMenu.extension) {
      items.push({
        label: 'Extension',
        icon: 'lucide:puzzle',
        children: [
          {
            label: 'Edit Extension',
            icon: 'lucide:edit',
            onSelect: () => {
              if (originalMenu) emit('edit-extension', originalMenu);
            }
          },
          {
            label: 'Delete Extension',
            icon: 'lucide:trash-2',
            color: 'error',
            onSelect: () => {
              if (originalMenu) emit('delete-extension', originalMenu);
            }
          }
        ]
      });
    } else {
      items.push({
        label: 'Create Extension',
        icon: 'lucide:puzzle',
        onSelect: () => {
          if (originalMenu) emit('edit-extension', originalMenu);
        }
      });
    }
  }

  const menuId = getId(originalMenu);
  const isCurrentlyMoving = movingMenuId.value !== null && String(movingMenuId.value) === String(menuId);

  if (isCurrentlyMoving) {
    items.push({
      type: 'separator'
    });

    items.push({
      label: 'Cancel Move',
      icon: 'lucide:x',
      color: 'error',
      onSelect: () => {
        handleCancelMove();
      }
    });
  } else if (!originalMenu.isSystem) {
    items.push({
      type: 'separator'
    });

    items.push({
      label: 'Move',
      icon: 'lucide:move',
      onSelect: () => {
        if (originalMenu) {
          const menuId = getId(originalMenu);
          movingMenuId.value = menuId;
          emit('move-menu', originalMenu);
        }
      }
    });

    items.push({
      label: 'Delete',
      icon: 'lucide:trash-2',
      color: 'error',
      onSelect: () => {
        if (originalMenu) emit('delete-menu', originalMenu);
      }
    });
  }

  return [items];
}

const movingMenuId = useState<string | number | null>('moving-menu-id', () => null);

const isMoving = computed(() => {
  const menuId = getId(props.item);
  return movingMenuId.value !== null && String(movingMenuId.value) === String(menuId);
});

const canMoveHere = computed(() => {
  if (!movingMenuId.value) return false;
  
  if (!props.item.isDropdown) return false;
  
  const menuId = getId(props.item);
  if (!menuId) return false;
  
  if (String(movingMenuId.value) === String(menuId)) return false;
  
  if (props.allMenus) {
    const movingMenu = props.allMenus.find(m => String(getId(m)) === String(movingMenuId.value));
    if (!movingMenu) return false;
    
    const currentParentId = getId(movingMenu.parent);
    if (String(currentParentId || null) === String(menuId)) {
      return false;
    }
    
    if (isDescendant(menuId, getId(movingMenu)!, props.allMenus)) {
      return false;
    }
  }
  
  return true;
});

function handleMoveHere() {
  if (!movingMenuId.value || !props.allMenus) return;
  
  const movingMenu = props.allMenus.find(m => String(getId(m)) === String(movingMenuId.value));
  if (!movingMenu) return;
  
  let newParent: MenuDefinition | null = null;
  
  if (props.item.isDropdown) {
    newParent = props.allMenus.find(m => String(getId(m)) === String(getId(props.item))) || null;
  }
  
  emit('move-menu-to', {
    menu: movingMenu,
    newParent: newParent
  });
  
  movingMenuId.value = null;
}

function handleCancelMove() {
  movingMenuId.value = null;
}
</script>

<template>
  <div>
    <UContextMenu
      :items="getContextMenuItems(item)"
    >
      <div
        v-if="item.isDropdown"
        :class="[
          'menu-item-dropdown-header flex items-center !gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer group relative',
          (level || 0) > 0 ? 'pl-3 md:pl-6' : 'pl-3',
          isMoving ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' : ''
        ]"
        @click="handleItemClick(item)"
      >
        <UIcon 
          name="lucide:grip-vertical" 
          class="w-4 h-4 text-gray-400 dark:text-gray-500 drag-handle cursor-move opacity-0 group-hover:opacity-100 transition-opacity" 
          @click.stop
        />
        <UIcon :name="item.icon || 'lucide:circle'" class="w-4 h-4 text-gray-600 dark:text-gray-400" />
        <span class="text-sm font-medium text-gray-700 dark:text-gray-300 flex-1">{{ item.label }}</span>
        <UButton
          v-if="canMoveHere && item.isDropdown"
          size="xs"
          color="primary"
          variant="soft"
          class="ml-2"
          @click.stop="handleMoveHere"
        >
          <UIcon name="lucide:move" class="w-3 h-3 mr-1" />
          Move here
        </UButton>
        <div v-if="isMoving" class="flex items-center gap-2 mr-2">
          <UBadge
            variant="soft"
            color="primary"
            size="xs"
          >
            <UIcon name="lucide:move" class="w-3 h-3 mr-1" />
            Moving
          </UBadge>
          <UButton
            size="xs"
            color="error"
            variant="soft"
            @click.stop="handleCancelMove"
          >
            <UIcon name="lucide:x" class="w-3 h-3" />
          </UButton>
        </div>
        <div class="flex items-center gap-1 ml-auto">
          <UBadge
            variant="soft"
            color="secondary"
            size="xs"
          >
            Dropdown
          </UBadge>
          <UBadge
            v-if="!item.isEnabled"
            variant="soft"
            color="error"
            size="xs"
          >
            Disabled
          </UBadge>
          <UBadge
            v-if="item.isSystem"
            variant="soft"
            color="warning"
            size="xs"
          >
            System
          </UBadge>
          <UBadge
            v-if="!item.isSystem"
            variant="soft"
            color="neutral"
            size="xs"
          >
            Custom
          </UBadge>
          <UBadge
            v-if="item.extension"
            variant="soft"
            color="primary"
            size="xs"
            class="cursor-pointer"
            :title="`Extension: ${item.extension.name || item.extension.description || getId(item.extension) || item.extension.extensionId}`"
            @click.stop="navigateTo(`/settings/extensions/${getId(item.extension) || item.extension.extensionId}`)"
          >
            <UIcon name="lucide:puzzle" class="w-3 h-3 mr-1" />
            {{ item.extension.name || item.extension.description || 'Extension' }}
          </UBadge>
        </div>
      </div>
      <div
        v-else
        :class="[
          'menu-item flex items-center !gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer group relative',
          (level || 0) > 0 ? 'pl-4 md:pl-6' : '',
          isMoving ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' : ''
        ]"
        @click="handleItemClick(item)"
      >
        <UIcon 
          name="lucide:grip-vertical" 
          class="w-4 h-4 text-gray-400 dark:text-gray-500 drag-handle cursor-move opacity-0 group-hover:opacity-100 transition-opacity" 
          @click.stop
        />
        <UIcon :name="item.icon || 'lucide:circle'" class="w-4 h-4 text-gray-600 dark:text-gray-400" />
        <span class="text-sm text-gray-700 dark:text-gray-300 flex-1">{{ item.label }}</span>
        <UButton
          v-if="canMoveHere"
          size="xs"
          color="primary"
          variant="soft"
          class="ml-2"
          @click.stop="handleMoveHere"
        >
          <UIcon name="lucide:move" class="w-3 h-3 mr-1" />
          Move here
        </UButton>
        <div v-if="isMoving" class="flex items-center gap-2 mr-2">
          <UBadge
            variant="soft"
            color="primary"
            size="xs"
          >
            <UIcon name="lucide:move" class="w-3 h-3 mr-1" />
            Moving
          </UBadge>
          <UButton
            size="xs"
            color="error"
            variant="soft"
            @click.stop="handleCancelMove"
          >
            <UIcon name="lucide:x" class="w-3 h-3" />
          </UButton>
        </div>
        <div class="flex items-center gap-1 ml-auto">
          <UBadge
            v-if="!item.isEnabled"
            variant="soft"
            color="error"
            size="xs"
          >
            Disabled
          </UBadge>
          <UBadge
            v-if="item.isSystem"
            variant="soft"
            color="warning"
            size="xs"
          >
            System
          </UBadge>
          <UBadge
            v-if="!item.isSystem"
            variant="soft"
            color="neutral"
            size="xs"
          >
            Custom
          </UBadge>
          <UBadge
            v-if="item.type === 'Menu' && item.extension"
            variant="soft"
            color="primary"
            size="xs"
            class="cursor-pointer"
            :title="`Extension: ${item.extension.name || item.extension.description || getId(item.extension) || item.extension.extensionId}`"
            @click.stop="navigateTo(`/settings/extensions/${getId(item.extension) || item.extension.extensionId}`)"
          >
            <UIcon name="lucide:puzzle" class="w-3 h-3 mr-1" />
            {{ item.extension.name || item.extension.description || 'Extension' }}
          </UBadge>
          <UBadge
            v-if="item.type === 'Menu' && !item.isSystem && !item.extension"
            variant="soft"
            color="neutral"
            size="xs"
            title="No extension - Right click to create"
          >
            <UIcon name="lucide:puzzle" class="w-3 h-3 mr-1" />
            No Extension
          </UBadge>
        </div>
      </div>
    
    <div 
      v-if="item.isDropdown" 
      class="mt-1"
    >
      <draggable
        v-model="childrenItems"
        :animation="200"
        handle=".drag-handle"
        ghost-class="ghost-item"
        chosen-class="chosen-item"
        drag-class="dragging-item"
        :group="{ name: 'menu-items', pull: false, put: false }"
        @change="handleChildrenReorder"
        item-key="id"
        :class="[
          'space-y-1',
          (level || 0) > 0 ? 'pl-4 md:pl-6' : 'pl-4 md:pl-6'
        ]"
      >
        <template #item="{ element: child }">
          <MenuVisualEditorItem
            :item="child"
            :level="(level || 0) + 1"
            :all-menus="allMenus"
            @edit-menu="$emit('edit-menu', $event)"
            @delete-menu="$emit('delete-menu', $event)"
            @toggle-enabled="$emit('toggle-enabled', $event)"
            @add-child-menu="$emit('add-child-menu', $event)"
            @edit-extension="$emit('edit-extension', $event)"
            @delete-extension="$emit('delete-extension', $event)"
            @reorder-menus="$emit('reorder-menus', $event)"
          />
        </template>
      </draggable>
    </div>
    </UContextMenu>
  </div>
</template>

<style scoped>
.drop-zone {
  position: relative;
}

.drop-zone:has(.sortable-ghost) {
  background-color: rgba(59, 130, 246, 0.05);
  border-color: rgb(59, 130, 246);
}

.menu-visual-editor-item :deep(.sortable-ghost) {
  opacity: 0.5;
  background: rgba(59, 130, 246, 0.1);
  border: 2px dashed rgb(59, 130, 246);
}

.menu-visual-editor-item :deep(.sortable-chosen) {
  opacity: 0.8;
}

.menu-visual-editor-item :deep(.sortable-drag) {
  opacity: 0.5;
  transform: rotate(2deg);
}
</style>

