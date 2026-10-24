<script setup lang="ts">
import type { MenuDefinition, MenuTreeItem } from '~/types';
import draggable from 'vuedraggable';
import { defaultPageId, isDefaultPageAncestor } from '~/utils/default-page';

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
const { isDesktop } = useScreen();
const { hasPermission } = usePermissions();
const { settings } = useGlobalState();
const isDefaultPage = computed(() => defaultPageId(settings.value.defaultPage) === String(props.item.id));
const protectsDefaultPage = computed(() => isDefaultPageAncestor(props.item.id, settings.value.defaultPage, props.allMenus ?? []));
const isDndUpdating = useState('menu-dnd-updating', () => false);
const isMenuDragActive = useState('menu-dnd-drag-active', () => false);
const itemLevel = computed(() => props.level || 0);
const isChildRow = computed(() => itemLevel.value > 0);

const originalMenu = computed(() => {
  return props.allMenus?.find(m => String(getId(m)) === String(props.item.id));
});

const childrenItems = ref<MenuTreeItem[]>(props.item.children || []);
const isExpanded = ref(true);
const hasChildren = computed(() => childrenItems.value.length > 0 || (props.item.children?.length ?? 0) > 0);

const rowSubtitle = computed(() => {
  const description = props.item.description?.trim();
  const path = props.item.path?.trim();
  if (props.item.isDropdown) {
    if (description) return description;
    const count = childrenItems.value.length;
    return `${count} child ${count === 1 ? 'item' : 'items'}`;
  }
  if (path && description && description !== props.item.label) {
    return `${path} · ${description}`;
  }
  if (path) return path;
  if (description) return description;
  return 'Navigation item';
});

watch(() => props.item.children, (newChildren) => {
  childrenItems.value = newChildren || [];
}, { deep: true });

function handleIconClick(event: Event) {
  if (isDesktop.value || !props.item.isDropdown) return;
  event.stopPropagation();
  if (hasChildren.value) {
    isExpanded.value = !isExpanded.value;
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

function handleChildrenReorder() {
  if (!props.allMenus) return;
  
  const parentId = getId(props.item);
  if (!parentId) return;
  
  const updatedMenus: MenuDefinition[] = [];
  const allMenus = props.allMenus;
  let hasOrderOrParentChange = false;
  
  const candidateUpdates = childrenItems.value
    .map((child: MenuTreeItem, index: number) => {
      const childMenuId = getId(child);
      if (!childMenuId) return null;
      
      const originalMenu = allMenus.find(m => String(getId(m)) === String(childMenuId));
      if (!originalMenu) return null;

      const currentParentId = getId(originalMenu.parent) || null;
      const nextParentId = parentId;
      const currentOrder = originalMenu.order;
      const nextOrder = index;

      if (String(currentParentId) !== String(nextParentId) || currentOrder !== nextOrder) {
        hasOrderOrParentChange = true;
      }

      return {
        ...originalMenu,
        parent: { id: parentId } as any,
        order: nextOrder
      };
    })
    .filter((entry): entry is MenuDefinition => entry !== null);

  if (hasOrderOrParentChange) {
    updatedMenus.push(...candidateUpdates);
  }

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
      if (hasPermission('/enfyra_extension', 'DELETE')) {
        items.push({
          label: 'Delete Extension',
          disabled: isDefaultPage.value,
          icon: 'lucide:trash-2',
          color: 'error',
          onSelect: () => {
            if (originalMenu) emit('delete-extension', originalMenu);
          }
        });
      }
    } else {
      if (hasPermission('/enfyra_extension', 'POST')) {
        items.push({
          label: 'Create Extension',
          icon: 'lucide:puzzle',
          onSelect: () => {
            if (originalMenu) emit('edit-extension', originalMenu);
          }
        });
      }
    }
    return items;
  }

  if (hasPermission('/enfyra_menu', 'PATCH')) {
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
        disabled: isDefaultPage.value && originalMenu.isEnabled,
        icon: originalMenu.isEnabled ? 'lucide:toggle-left' : 'lucide:toggle-right',
        onSelect: () => {
          if (originalMenu) emit('toggle-enabled', { menu: originalMenu, enabled: !originalMenu.isEnabled });
        }
      }
    );
  }

  if (originalMenu.type === 'Dropdown Menu' && canAcceptChildMenus.value && hasPermission('/enfyra_menu', 'POST')) {
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
      const extensionChildren: any[] = [];
      if (hasPermission('/enfyra_extension', 'PATCH')) {
        extensionChildren.push({
          label: 'Edit Extension',
          icon: 'lucide:edit',
          onSelect: () => {
            if (originalMenu) emit('edit-extension', originalMenu);
          }
        });
      }
      if (hasPermission('/enfyra_extension', 'DELETE')) {
        extensionChildren.push({
          label: 'Delete Extension',
          disabled: isDefaultPage.value,
          icon: 'lucide:trash-2',
          color: 'error',
          onSelect: () => {
            if (originalMenu) emit('delete-extension', originalMenu);
          }
        });
      }
      if (extensionChildren.length > 0) {
        items.push({
          label: 'Extension',
          icon: 'lucide:puzzle',
          children: extensionChildren
        });
      }
    } else {
      if (hasPermission('/enfyra_extension', 'POST')) {
        items.push({
          label: 'Create Extension',
          icon: 'lucide:puzzle',
          onSelect: () => {
            if (originalMenu) emit('edit-extension', originalMenu);
          }
        });
      }
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
  } else if (!originalMenu.isSystem && hasPermission('/enfyra_menu', 'DELETE')) {
    items.push({
      type: 'separator'
    });

    if (hasPermission('/enfyra_menu', 'PATCH')) {
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
    }

    items.push({
      label: 'Delete',
      disabled: protectsDefaultPage.value,
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
        'menu-editor-row group cursor-default',
        isChildRow ? 'is-child' : '',
        isMoving ? 'is-moving' : '',
        !item.isEnabled ? 'is-disabled' : ''
      ]"
    >
      <div class="menu-row-lead">
        <button
          type="button"
          class="menu-row-drag drag-handle"
          aria-label="Drag menu item"
          @click.stop
        >
          <UIcon name="lucide:grip-vertical" :class="isChildRow ? 'h-3.5 w-3.5' : 'h-4 w-4'" />
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
              'h-4 w-4 transition-transform duration-[var(--duration-fast)] ease-[var(--ease-enter)]',
              isExpanded ? 'rotate-90' : ''
            ]"
          />
        </button>
      </div>

      <component
        :is="!isDesktop && item.isDropdown ? 'button' : 'span'"
        :type="!isDesktop && item.isDropdown ? 'button' : undefined"
        :disabled="!isDesktop && item.isDropdown ? !hasChildren : undefined"
        :aria-label="!isDesktop && item.isDropdown ? `Toggle children of ${item.label}` : undefined"
        :aria-expanded="!isDesktop && item.isDropdown ? isExpanded : undefined"
        :class="['menu-row-icon accent-tile', iconToneClass]"
        @click="handleIconClick"
      >
        <UIcon :name="item.icon || 'lucide:circle'" class="h-4 w-4 text-current" />
        <UIcon v-if="!isDesktop && item.isDropdown" name="lucide:chevron-right" class="absolute -bottom-0.5 -right-0.5 size-3 rounded-[var(--radius-subcontrol)] bg-default" :class="isExpanded ? 'rotate-90' : ''" />
      </component>

      <div class="menu-row-main">
        <div class="menu-row-title-line">
          <span class="menu-row-title">{{ item.label }}</span>
          <UIcon
            v-if="isSystemMenu"
            name="lucide:lock"
            class="h-3.5 w-3.5 shrink-0 text-[var(--text-quaternary)]"
            title="System menu - cannot be edited"
          />
        </div>

        <div class="menu-row-subtitle-line">
          <span class="menu-row-subtitle">{{ rowSubtitle }}</span>
        </div>
      </div>

      <div class="menu-row-actions">
        <div class="menu-row-meta">
          <UBadge v-if="isDefaultPage" variant="soft" color="primary" size="xs" title="Change the default page in General Settings before deleting this menu">Default page</UBadge>
          <UBadge variant="soft" :color="typeBadgeColor" size="xs">
            {{ item.isDropdown ? 'Dropdown' : 'Menu' }}
          </UBadge>
          <UBadge variant="soft" :color="ownershipBadgeColor" size="xs">
            {{ item.isSystem ? 'System' : 'Custom' }}
          </UBadge>
          <UBadge v-if="!item.isEnabled" variant="soft" color="error" size="xs">
            Disabled
          </UBadge>
          <NuxtLink
            v-if="item.type === 'Menu' && item.extension"
            :to="`/settings/extensions/${getExtensionId()}`"
            class="menu-row-extension inline-flex min-w-0 max-w-full"
            @click.stop
          >
            <UBadge
              variant="soft"
              color="primary"
              size="xs"
              class="max-w-full cursor-pointer overflow-hidden"
              :title="`Extension: ${extensionLabel}`"
            >
              <UIcon name="lucide:puzzle" class="mr-1 h-3 w-3" />
              <span class="min-w-0 truncate">{{ extensionLabel }}</span>
            </UBadge>
          </NuxtLink>
        </div>

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
            class="pointer-coarse:min-h-[44px] pointer-coarse:min-w-[44px]"
            @click.stop="handleCancelMove"
          />
        </template>

        <UDropdownMenu
          v-if="menuItems.length > 0"
          :items="[menuItems]"
          :content="{ side: 'bottom', align: 'end' }"
        >
          <UButton
            size="xs"
            color="neutral"
            variant="ghost"
            icon="lucide:more-vertical"
            aria-label="Menu actions"
            class="pointer-coarse:min-h-[44px] pointer-coarse:min-w-[44px]"
            @click.stop
          />
        </UDropdownMenu>
      </div>
    </div>

    <div
      v-if="item.isDropdown && isExpanded"
      class="menu-editor-children-wrap"
    >
      <div
        v-if="showChildDropHint && !hasChildren"
        class="menu-child-drop-placeholder pointer-events-none"
      >
        <UIcon name="lucide:corner-down-right" class="h-4 w-4" />
        <span>Drop here to add as child</span>
      </div>
      <draggable
        v-model="childrenItems"
        :animation="140"
        :disabled="isDndUpdating || !isDesktop"
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
      >
        <template #item="{ element: child }">
          <MenuVisualEditorItem
            :item="child"
            :level="(level || 0) + 1"
            v-bind="props.allMenus === undefined ? {} : { allMenus: props.allMenus }"
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
  display: grid;
  gap: 8px;
}

.menu-editor-row {
  display: grid;
  grid-template-columns: auto 36px minmax(220px, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid transparent;
  border-radius: var(--radius-panel);
  background: transparent;
  transition: background-color var(--duration-instant) var(--ease-standard), border-color var(--duration-instant) var(--ease-standard), box-shadow var(--duration-instant) var(--ease-standard);
}

.menu-editor-row.is-child {
  grid-template-columns: auto 32px minmax(180px, 1fr) auto;
  gap: 10px;
  padding: 9px;
  border-radius: var(--radius-control);
  background: var(--surface-muted);
}

.menu-editor-row.is-moving {
  border-color: var(--badge-primary-soft-border);
  background: var(--badge-primary-soft-bg);
  box-shadow: inset 0 0 0 1px var(--badge-primary-soft-border);
}

.menu-editor-row.is-disabled {
  opacity: 0.68;
}

.menu-row-lead {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

.menu-row-drag,
.menu-row-chevron {
  display: inline-flex;
  width: 16px;
  height: 16px;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-subcontrol);
  color: var(--text-quaternary);
  transition: background-color var(--duration-instant) var(--ease-standard), color var(--duration-instant) var(--ease-standard);
}

.menu-editor-row.is-child .menu-row-drag {
  width: 14px;
  height: 14px;
}

.menu-row-drag {
  cursor: move;
}

.menu-row-chevron:not(:disabled) {
  cursor: pointer;
}

@media (hover: hover) and (pointer: fine) and (min-width: 1024px) {
  .menu-row-chevron:not(:disabled):hover,
  .menu-row-drag:hover {
    background: var(--state-neutral-soft-bg);
    color: var(--text-secondary);
  }
}

.menu-row-chevron:disabled {
  opacity: 0.28;
}

.menu-row-icon {
  display: inline-flex;
  width: 36px;
  height: 36px;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-control);
}

.menu-editor-row.is-child .menu-row-icon {
  width: 32px;
  height: 32px;
}

.menu-row-main {
  display: grid;
  min-width: 0;
  gap: 6px;
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
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 700;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.menu-editor-row.is-child .menu-row-title {
  font-size: 13.5px;
}

.menu-row-subtitle-line {
  display: flex;
  min-width: 0;
  align-items: center;
}

.menu-row-subtitle {
  min-width: 0;
  overflow: hidden;
  color: var(--text-tertiary);
  font-size: 12px;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.menu-row-meta {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
}

.menu-row-actions {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.menu-editor-children {
  display: grid;
  gap: 8px;
  margin-left: 28px;
  border-left: 1px solid var(--border-subtle);
  padding-left: 12px;
  transition: background-color var(--duration-instant) var(--ease-standard), border-color var(--duration-instant) var(--ease-standard), box-shadow var(--duration-instant) var(--ease-standard);
}

.menu-editor-children.is-empty {
  display: none;
}

.menu-editor-children.is-empty.is-dragging-target {
  display: grid;
  min-height: 48px;
  padding-top: 6px;
  padding-bottom: 8px;
}

.menu-editor-children.is-dragging-target {
  border-radius: var(--radius-panel);
  border-color: color-mix(in srgb, var(--md-primary) 20%, transparent);
  background: color-mix(in srgb, var(--md-primary) 3%, transparent);
  box-shadow: inset 2px 0 0 color-mix(in srgb, var(--md-primary) 38%, transparent);
}

.menu-child-drop-placeholder {
  position: absolute;
  inset: 6px 0 8px 40px;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--state-primary-soft-text);
  font-weight: 750;
  min-height: 36px;
  border-radius: var(--radius-control);
  background: color-mix(in srgb, var(--md-primary) 6%, var(--md-surface));
  padding: 0 12px;
  font-size: 13px;
  box-shadow: inset 2px 0 0 color-mix(in srgb, var(--md-primary) 44%, transparent);
}

.menu-editor-children-wrap {
  position: relative;
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
  min-height: 52px;
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

@media (pointer: coarse) {
  .menu-editor-row {
    grid-template-columns: auto 36px minmax(0, 1fr) auto;
  }

  .menu-row-drag,
  .menu-row-chevron {
    width: 44px;
    height: 44px;
  }
}

@media (max-width: 1023px) {
  .menu-editor-row {
    grid-template-columns: 36px minmax(0, 1fr) auto;
    gap: 10px;
    padding: 10px 4px;
  }

  .menu-editor-row.is-child {
    grid-template-columns: 32px minmax(0, 1fr) auto;
    padding: 9px;
  }

  .menu-row-lead,
  .menu-row-drag,
  .menu-row-chevron {
    display: none;
  }

  .menu-row-icon {
    position: relative;
    width: 36px;
    height: 36px;
    align-self: start;
  }

  .menu-editor-row.is-child .menu-row-icon {
    width: 32px;
    height: 32px;
  }

  .menu-row-icon:disabled {
    cursor: default;
  }

  .menu-row-main {
    display: grid;
    gap: 5px;
  }

  .menu-row-actions {
    grid-column: 3;
    grid-row: 1;
    align-self: start;
    flex-wrap: wrap;
    max-width: 180px;
  }

  .menu-row-meta {
    gap: 4px;
  }

  .menu-row-title {
    white-space: normal;
    overflow-wrap: anywhere;
    line-height: 1.4;
  }

  .menu-row-extension {
    flex-basis: 100%;
  }

  .menu-editor-children {
    margin-left: 16px;
  }
}

@media (pointer: coarse) and (max-width: 1023px) {
  .menu-editor-row,
  .menu-editor-row.is-child {
    grid-template-columns: 44px minmax(0, 1fr) auto;
  }

  .menu-row-icon,
  .menu-editor-row.is-child .menu-row-icon {
    width: 44px;
    height: 44px;
  }
}
</style>
