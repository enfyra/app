<script setup lang="ts">
import type { MenuDefinition, MenuTreeItem, DragEvent } from '~/types';
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
const { isMobile } = useScreen();
const isDndUpdating = useState('menu-dnd-updating', () => false);
const isMenuDragActive = useState('menu-dnd-drag-active', () => false);
const itemLevel = computed(() => props.level || 0);

const originalMenu = computed(() => {
  return props.allMenus?.find(m => String(getId(m)) === String(props.item.id));
});

const childrenStyle = computed(() => {
  const parentLevel = props.level || 0;
  const base = 12 + parentLevel * 14;
  const guideLeft = isMobile.value ? base + 62 : base + 66;
  return {
    paddingLeft: '10px',
    '--menu-children-guide-left': `${guideLeft}px`,
  };
});

const childrenItems = ref<MenuTreeItem[]>(props.item.children || []);
const isExpanded = ref(true);
const hasChildren = computed(() => childrenItems.value.length > 0 || (props.item.children?.length ?? 0) > 0);
const canEditMenu = computed(() => !isSystemMenu.value);
const rowStyle = computed(() => ({
  '--menu-depth': String(itemLevel.value)
}));

watch(() => props.item.children, (newChildren) => {
  childrenItems.value = newChildren || [];
}, { deep: true });

function handleItemClick(menu: MenuTreeItem) {
  const originalMenu = props.allMenus?.find(m => String(getId(m)) === String(menu.id));
  if (originalMenu) {
    if (originalMenu.isSystem) {
      return;
    }
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
  if (!props.allMenus) return;
  
  const parentId = getId(props.item);
  if (!parentId) return;
  
  const updatedMenus: MenuDefinition[] = [];
  const allMenus = props.allMenus;
  
  childrenItems.value.forEach((child: MenuTreeItem, index: number) => {
    const childMenuId = getId(child);
    if (!childMenuId) return;
    
    const originalMenu = allMenus.find(m => String(getId(m)) === String(childMenuId));
    if (!originalMenu) return;

    const currentParentId = getId(originalMenu.parent) || null;
    const nextParentId = parentId;
    const currentOrder = originalMenu.order;
    const nextOrder = index;

    if (String(currentParentId) !== String(nextParentId) || currentOrder !== nextOrder) {
      updatedMenus.push({
        ...originalMenu,
        parent: { id: parentId } as any,
        order: nextOrder
      });
    }
  });

  if (updatedMenus.length > 0) emit('reorder-menus', updatedMenus);
}

function canDropIntoChildren(event: any) {
  if (!canAcceptChildMenus.value) return false;

  const targetParentId = getId(props.item) || null;
  if (!targetParentId) return false;

  const dragged = event?.draggedContext?.element;
  const draggedId = getId(dragged);
  if (!draggedId) return false;
  if (String(draggedId) === String(targetParentId)) return false;
  if (props.allMenus && isDescendant(targetParentId, draggedId, props.allMenus)) return false;

  if (!dragged?.isSystem) return true;

  const draggedMenu = props.allMenus?.find((menu) => String(getId(menu)) === String(getId(dragged)));
  const originalParentId = getId(draggedMenu?.parent) || null;
  return String(originalParentId || null) === String(targetParentId || null);
}

const menuItems = computed(() => {
  const originalMenu = props.allMenus?.find(m => String(getId(m)) === String(props.item.id));
  if (!originalMenu) return [];

  const isDashboard = originalMenu.path === '/dashboard';

  if (originalMenu.isSystem && originalMenu.type !== 'Dropdown Menu' && !isDashboard) {
    return [];
  }

  if (originalMenu.isSystem && originalMenu.type === 'Dropdown Menu') {
    if (!canAcceptChildMenus.value) return [];

    return [
      {
        label: 'Add Child Menu',
        icon: 'lucide:plus-circle',
        onSelect: () => {
          if (originalMenu) emit('add-child-menu', originalMenu);
        }
      }
    ];
  }

  const items: any[] = [];

  if (isDashboard && originalMenu.isSystem) {
    if (originalMenu.extension) {
      items.push({
        label: 'Edit Extension',
        icon: 'lucide:puzzle',
        onSelect: () => {
          if (originalMenu) emit('edit-extension', originalMenu);
        }
      });
      items.push({
        label: 'Delete Extension',
        icon: 'lucide:trash-2',
        color: 'error',
        onSelect: () => {
          if (originalMenu) emit('delete-extension', originalMenu);
        }
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
    return items;
  }

  items.push(
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
  );

  if (originalMenu.type === 'Dropdown Menu' && canAcceptChildMenus.value) {
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

  return items;
});


const movingMenuId = useState<string | number | null>('moving-menu-id', () => null);

const isMoving = computed(() => {
  const menuId = getId(props.item);
  return movingMenuId.value !== null && String(movingMenuId.value) === String(menuId);
});

const isSystemMenu = computed(() => {
  return originalMenu.value?.isSystem === true;
});

const canAcceptChildMenus = computed(() => originalMenu.value?.path !== '/data');
const childDragGroup = computed(() => ({
  name: 'menu-items',
  pull: true,
  put: canAcceptChildMenus.value
}));
const typeBadgeColor = computed(() => props.item.isDropdown ? 'info' : 'neutral');
const ownershipBadgeColor = computed(() => props.item.isSystem ? 'warning' : 'neutral');
const iconToneClass = computed(() => props.item.isDropdown ? 'accent-tile-primary' : 'accent-tile-neutral');

function getExtensionId() {
  const extension = props.item.extension as any;
  return getId(extension) || extension?.extensionId;
}

const extensionLabel = computed(() => {
  const extension = props.item.extension as any;
  return extension?.name || extension?.description || 'Extension';
});

const canMoveHere = computed(() => {
  if (!movingMenuId.value) return false;
  
  if (!props.item.isDropdown) return false;

  if (!canAcceptChildMenus.value) return false;
  
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

const showChildDropHint = computed(() =>
  isMenuDragActive.value &&
  props.item.isDropdown &&
  isExpanded.value &&
  canAcceptChildMenus.value
);

function handleMoveHere() {
  if (!movingMenuId.value || !props.allMenus) return;
  
  const movingMenu = props.allMenus.find(m => String(getId(m)) === String(movingMenuId.value));
  if (!movingMenu) return;
  
  let newParent: MenuDefinition | null = null;
  
  if (props.item.isDropdown && canAcceptChildMenus.value) {
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

function handleDragStart() {
  isMenuDragActive.value = true;
}

function handleDragEnd() {
  isMenuDragActive.value = false;
}
</script>

<template>
  <div class="menu-editor-node">
    <div
      :class="[
        'menu-editor-row group',
        canEditMenu ? 'is-editable cursor-pointer' : 'cursor-default',
        isMoving ? 'is-moving' : '',
        !item.isEnabled ? 'is-disabled' : ''
      ]"
      :style="rowStyle"
      @click="handleItemClick(item)"
    >
      <button
        type="button"
        class="menu-row-drag drag-handle"
        aria-label="Drag menu item"
        @click.stop
      >
        <UIcon name="lucide:grip-vertical" class="h-4 w-4" />
      </button>

      <button
        v-if="item.isDropdown"
        type="button"
        class="menu-row-chevron"
        :class="isExpanded ? 'is-open' : ''"
        :disabled="!hasChildren"
        aria-label="Toggle children"
        @click.stop="isExpanded = !isExpanded"
      >
        <UIcon
          name="lucide:chevron-right"
          :class="[
            'h-4 w-4 transition-transform duration-150 ease-out',
            isExpanded ? 'rotate-90' : ''
          ]"
        />
      </button>
      <span v-else class="menu-row-chevron-placeholder" />

      <span :class="['menu-row-icon accent-tile', iconToneClass]">
        <UIcon :name="item.icon || 'lucide:circle'" class="h-4 w-4 text-current" />
      </span>

      <div class="menu-row-main">
        <div class="menu-row-title-line">
          <span class="menu-row-title">{{ item.label }}</span>
          <UIcon
            v-if="isSystemMenu"
            name="lucide:lock"
            class="h-3.5 w-3.5 text-[var(--text-quaternary)]"
            title="System menu - cannot be edited"
          />
        </div>

        <div class="menu-row-meta">
          <UBadge variant="soft" :color="typeBadgeColor" size="xs">
            {{ item.isDropdown ? 'Dropdown' : 'Menu' }}
          </UBadge>
          <UBadge variant="soft" :color="ownershipBadgeColor" size="xs">
            {{ item.isSystem ? 'System' : 'Custom' }}
          </UBadge>
          <UBadge v-if="!item.isEnabled" variant="soft" color="error" size="xs">
            Disabled
          </UBadge>
          <UBadge
            v-if="item.type === 'Menu' && item.extension"
            variant="soft"
            color="primary"
            size="xs"
            class="cursor-pointer"
            :title="`Extension: ${extensionLabel}`"
            @click.stop="navigateTo(`/settings/extensions/${getExtensionId()}`)"
          >
            <UIcon name="lucide:puzzle" class="mr-1 h-3 w-3" />
            {{ extensionLabel }}
          </UBadge>
        </div>
      </div>

      <div class="menu-row-actions">
        <UButton
          v-if="canMoveHere"
          size="xs"
          color="primary"
          variant="soft"
          icon="lucide:move"
          label="Move here"
          @click.stop="handleMoveHere"
        />

        <template v-if="isMoving">
          <UBadge variant="soft" color="primary" size="xs">
            <UIcon name="lucide:move" class="mr-1 h-3 w-3" />
            Moving
          </UBadge>
          <UButton
            size="xs"
            color="error"
            variant="soft"
            icon="lucide:x"
            aria-label="Cancel move"
            @click.stop="handleCancelMove"
          />
        </template>

        <UDropdownMenu
          v-if="menuItems.length > 0"
          :items="[menuItems]"
          :modal="false"
          :content="{ side: 'bottom', align: 'end' }"
        >
          <UButton
            size="xs"
            color="neutral"
            variant="ghost"
            icon="lucide:more-vertical"
            aria-label="Menu actions"
            @click.stop
          />
        </UDropdownMenu>
      </div>
    </div>

    <div
      v-if="item.isDropdown && isExpanded"
      class="menu-editor-children-wrap"
    >
      <draggable
        v-model="childrenItems"
        :animation="140"
        :disabled="isDndUpdating"
        handle=".drag-handle"
        ghost-class="ghost-item"
        chosen-class="chosen-item"
        drag-class="dragging-item"
        :group="childDragGroup"
        :move="canDropIntoChildren"
        @start="handleDragStart"
        @end="handleDragEnd"
        @change="handleChildrenReorder"
        item-key="id"
        class="menu-editor-children drop-zone"
        :class="{ 'is-empty': !hasChildren, 'is-dragging-target': showChildDropHint }"
        :style="childrenStyle"
      >
        <template #header>
          <div
            v-if="showChildDropHint && !hasChildren"
            class="menu-child-drop-placeholder"
          >
            <UIcon name="lucide:corner-down-right" class="h-4 w-4" />
            <span>Drop here to add as child</span>
          </div>
          <div
            v-else-if="showChildDropHint"
            class="menu-child-drop-inline-hint"
          >
            <UIcon name="lucide:corner-down-right" class="h-3.5 w-3.5" />
            <span>Drop inside {{ item.label }}</span>
          </div>
        </template>
        <template #item="{ element: child }">
          <MenuVisualEditorItem
            :item="child"
            :level="(level || 0) + 1"
            :all-menus="props.allMenus"
            @edit-menu="$emit('edit-menu', $event)"
            @delete-menu="$emit('delete-menu', $event)"
            @toggle-enabled="$emit('toggle-enabled', $event)"
            @add-child-menu="$emit('add-child-menu', $event)"
            @edit-extension="$emit('edit-extension', $event)"
            @delete-extension="$emit('delete-extension', $event)"
            @reorder-menus="$emit('reorder-menus', $event)"
            @move-menu="$emit('move-menu', $event)"
            @move-menu-to="$emit('move-menu-to', $event)"
          />
        </template>
      </draggable>
    </div>
  </div>
</template>

<style scoped>
.menu-editor-node {
  position: relative;
}

.menu-editor-row {
  display: grid;
  grid-template-columns: 18px 24px 40px minmax(220px, 1fr) auto;
  align-items: center;
  gap: 12px;
  min-height: 64px;
  padding: 10px 12px 10px calc(12px + (var(--menu-depth, 0) * 14px));
  border: 1px solid transparent;
  border-radius: var(--radius-panel);
  background: transparent;
  transition: background-color 110ms ease, border-color 110ms ease, box-shadow 110ms ease;
}

.menu-editor-row.is-editable:hover {
  border-color: var(--card-border-hover);
  background: var(--state-primary-soft-bg);
}

.menu-editor-row.is-moving {
  border-color: var(--badge-primary-soft-border);
  background: var(--badge-primary-soft-bg);
  box-shadow: inset 0 0 0 1px var(--badge-primary-soft-border);
}

.menu-editor-row.is-disabled {
  opacity: 0.68;
}

.menu-row-drag,
.menu-row-chevron {
  display: inline-flex;
  width: 24px;
  height: 24px;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-subcontrol);
  color: var(--text-quaternary);
  transition: background-color 110ms ease, color 110ms ease;
}

.menu-row-drag {
  width: 18px;
  cursor: move;
  opacity: 0;
}

.menu-row-drag-placeholder {
  width: 18px;
  height: 24px;
}

.menu-editor-row:hover .menu-row-drag {
  opacity: 1;
}

.menu-row-chevron:not(:disabled) {
  cursor: pointer;
}

.menu-row-chevron:not(:disabled):hover,
.menu-row-drag:hover {
  background: var(--state-neutral-soft-bg);
  color: var(--text-secondary);
}

.menu-row-chevron:disabled {
  opacity: 0.28;
}

.menu-row-chevron-placeholder {
  width: 24px;
  height: 24px;
}

.menu-row-icon {
  display: inline-flex;
  width: 40px;
  height: 40px;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-control);
}

.menu-row-main {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 12px;
}

.menu-row-title-line {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 7px;
}

.menu-row-title {
  min-width: 0;
  overflow: hidden;
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 700;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.menu-row-meta {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.menu-row-actions {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
}

.menu-editor-children {
  display: grid;
  gap: 6px;
  margin-top: 6px;
  padding-top: 6px;
  padding-bottom: 8px;
  border: 1px solid transparent;
  border-radius: var(--radius-panel);
  transition: background-color 110ms ease, border-color 110ms ease, box-shadow 110ms ease;
}

.menu-editor-children::before {
  content: "";
  position: absolute;
  left: var(--menu-children-guide-left, 12px);
  top: 2px;
  bottom: 10px;
  width: 1px;
  background: var(--border-subtle);
  pointer-events: none;
}

.menu-editor-children.is-empty::before {
  display: none;
}

.menu-editor-children.is-dragging-target {
  border-color: color-mix(in srgb, var(--md-primary) 20%, transparent);
  background: color-mix(in srgb, var(--md-primary) 3%, transparent);
  box-shadow: inset 2px 0 0 color-mix(in srgb, var(--md-primary) 38%, transparent);
}

.menu-editor-children.is-empty.is-dragging-target {
  min-height: 48px;
}

.menu-child-drop-placeholder,
.menu-child-drop-inline-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--state-primary-soft-text);
  font-weight: 750;
}

.menu-child-drop-placeholder {
  min-height: 38px;
  border-radius: var(--radius-control);
  background: color-mix(in srgb, var(--md-primary) 6%, var(--md-surface));
  padding: 0 12px;
  font-size: 13px;
  box-shadow: inset 2px 0 0 color-mix(in srgb, var(--md-primary) 44%, transparent);
}

.menu-child-drop-inline-hint {
  min-height: 26px;
  padding: 0 10px;
  font-size: 12px;
}

.menu-editor-children-wrap {
  animation: menu-children-enter 120ms ease-out;
}

@keyframes menu-children-enter {
  from {
    opacity: 0;
    transform: translateY(-2px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.drop-zone {
  position: relative;
}

.drop-zone:has(.sortable-ghost) {
  border-color: var(--md-primary);
  background-color: color-mix(in srgb, var(--md-primary) 8%, transparent);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--md-primary) 30%, transparent);
}

.menu-editor-node :deep(.sortable-ghost) {
  min-height: 64px;
  opacity: 1;
  border-radius: var(--radius-panel);
  background: color-mix(in srgb, var(--md-primary) 10%, var(--md-surface));
  box-shadow: inset 2px 0 0 color-mix(in srgb, var(--md-primary) 44%, transparent);
}

.menu-editor-node :deep(.sortable-chosen) {
  opacity: 1;
}

.menu-editor-node :deep(.sortable-drag) {
  opacity: 0.94;
  border-radius: var(--radius-panel);
  box-shadow: var(--shadow-md);
}

@media (max-width: 640px) {
  .menu-editor-row {
    grid-template-columns: 18px 22px 36px minmax(0, 1fr);
  }

  .menu-row-main {
    display: grid;
    gap: 5px;
  }

  .menu-row-actions {
    grid-column: 4;
    justify-content: flex-start;
  }
}
</style>
