<script setup lang="ts">
defineOptions({ name: "SidebarMenuTree" });

const props = withDefaults(defineProps<{
  items: any[];
  collapsed?: boolean;
  labelsVisible?: boolean;
  level?: number;
  useDots?: boolean;
}>(), {
  collapsed: false,
  labelsVisible: true,
  level: 0,
  useDots: false,
});

const STORAGE_KEY = "sidebar-menu-open-keys";
const openMenuKeys = useState<Record<string, boolean>>("sidebar-menu-open-keys", () => ({}));
const { getMenuNotification } = useMenuNotificationRegistry();

function menuKey(item: any): string {
  return item.to || item.label;
}

function isMenuOpen(item: any): boolean {
  const key = menuKey(item);
  return openMenuKeys.value[key] ?? true;
}

function toggleMenu(item: any) {
  if (!item.children?.length) return;
  const key = menuKey(item);
  openMenuKeys.value = {
    ...openMenuKeys.value,
    [key]: !isMenuOpen(item),
  };
}

function shouldUseDots(item: any): boolean {
  return props.useDots || item.id === "data" || item.to === "/data" || item.label === "Data";
}

function notificationFor(item: any) {
  return getMenuNotification(item);
}

function notificationValue(item: any) {
  const notification = notificationFor(item);
  return item.count ?? notification?.value ?? null;
}

function hasNotification(item: any) {
  return notificationValue(item) != null || Boolean(notificationFor(item));
}

function notificationColor(item: any) {
  return notificationFor(item)?.color ?? "primary";
}

function notificationTitle(item: any) {
  return notificationFor(item)?.title;
}

function beforeChildrenEnter(element: Element) {
  const el = element as HTMLElement;
  el.style.height = "0";
  el.style.opacity = "0";
}

function childrenEnter(element: Element) {
  const el = element as HTMLElement;
  el.style.height = `${el.scrollHeight}px`;
  el.style.opacity = "1";
}

function afterChildrenEnter(element: Element) {
  const el = element as HTMLElement;
  el.style.height = "auto";
  el.style.opacity = "";
}

function beforeChildrenLeave(element: Element) {
  const el = element as HTMLElement;
  el.style.height = `${el.scrollHeight}px`;
  el.style.opacity = "1";
}

function childrenLeave(element: Element) {
  const el = element as HTMLElement;
  void el.offsetHeight;
  el.style.height = "0";
  el.style.opacity = "0";
}

function afterChildrenLeave(element: Element) {
  const el = element as HTMLElement;
  el.style.height = "";
  el.style.opacity = "";
}

onMounted(() => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      openMenuKeys.value = JSON.parse(saved);
    }
  } catch {}
});

watch(
  openMenuKeys,
  (value) => {
    if (!import.meta.client) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  },
  { deep: true },
);
</script>

<template>
  <div
    class="app-sidebar-tree"
    :class="[`level-${props.level}`, { nested: props.level > 0 }]"
  >
    <template v-for="item in items" :key="menuKey(item)">
      <NuxtLink
        v-if="!item.collapsible && !item.children?.length"
        :to="item.to"
        class="app-sidebar-link"
        :class="{ active: item.active, collapsed: props.collapsed, 'with-count': hasNotification(item) }"
        :title="props.collapsed ? item.label : undefined"
      >
        <UIcon
          v-if="props.level === 0 || !props.useDots"
          :name="item.icon || 'lucide:circle'"
          class="app-sidebar-icon"
        />
        <span v-else class="app-sidebar-dot" />
        <span v-if="!props.collapsed" class="app-sidebar-text" :class="{ hidden: !props.labelsVisible }">{{ item.label }}</span>
        <span
          v-if="!props.collapsed && notificationValue(item) != null"
          class="app-sidebar-count"
          :class="{ hidden: !props.labelsVisible }"
          :data-color="notificationColor(item)"
          :title="notificationTitle(item)"
        >{{ notificationValue(item) }}</span>
        <span
          v-else-if="!props.collapsed && hasNotification(item)"
          class="app-sidebar-notification-dot"
          :class="{ hidden: !props.labelsVisible }"
          :data-color="notificationColor(item)"
          :title="notificationTitle(item)"
        />
        <span
          v-if="props.collapsed && hasNotification(item)"
          class="app-sidebar-collapsed-notification"
          :data-color="notificationColor(item)"
          :title="notificationTitle(item)"
        />
      </NuxtLink>

      <div v-else class="app-sidebar-collapse" :class="{ collapsed: props.collapsed, empty: !item.children?.length }">
        <button
          type="button"
          class="app-sidebar-link"
          :class="{
            active: item.active,
            collapsed: props.collapsed,
            'with-collapse': !props.collapsed,
            'with-count': hasNotification(item),
            disabled: !item.children?.length
          }"
          :title="props.collapsed ? item.label : undefined"
          :aria-expanded="isMenuOpen(item)"
          :aria-disabled="!item.children?.length"
          :disabled="!item.children?.length"
          @click="toggleMenu(item)"
        >
          <UIcon
            v-if="props.level === 0 || !props.useDots"
            :name="item.icon || 'lucide:circle'"
            class="app-sidebar-icon"
          />
          <span v-else class="app-sidebar-dot" />
          <span v-if="!props.collapsed" class="app-sidebar-text" :class="{ hidden: !props.labelsVisible }">{{ item.label }}</span>
          <span
            v-if="!props.collapsed && notificationValue(item) != null"
            class="app-sidebar-count"
            :class="{ hidden: !props.labelsVisible }"
            :data-color="notificationColor(item)"
            :title="notificationTitle(item)"
          >{{ notificationValue(item) }}</span>
          <span
            v-else-if="!props.collapsed && hasNotification(item)"
            class="app-sidebar-notification-dot"
            :class="{ hidden: !props.labelsVisible }"
            :data-color="notificationColor(item)"
            :title="notificationTitle(item)"
          />
          <span
            v-if="props.collapsed && hasNotification(item)"
            class="app-sidebar-collapsed-notification"
            :data-color="notificationColor(item)"
            :title="notificationTitle(item)"
          />
          <UIcon
            v-if="!props.collapsed && item.children?.length"
            name="lucide:chevron-down"
            class="app-sidebar-chevron"
            :class="{ open: isMenuOpen(item), hidden: !props.labelsVisible }"
          />
        </button>

        <Transition
          name="sidebar-children"
          @before-enter="beforeChildrenEnter"
          @enter="childrenEnter"
          @after-enter="afterChildrenEnter"
          @before-leave="beforeChildrenLeave"
          @leave="childrenLeave"
          @after-leave="afterChildrenLeave"
        >
          <div
            v-if="item.children?.length && !props.collapsed && isMenuOpen(item)"
            class="app-sidebar-children"
          >
            <SidebarMenuTree
              :items="item.children"
              :collapsed="props.collapsed"
              :labels-visible="props.labelsVisible"
              :level="props.level + 1"
              :use-dots="shouldUseDots(item)"
            />
          </div>
        </Transition>
      </div>
    </template>
  </div>
</template>

<style scoped>
.app-sidebar-tree {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.app-sidebar-tree.nested {
  gap: 1px;
  margin: 1px 0 8px 12px;
  padding-left: 12px;
  border-left: 1px solid var(--nav-child-border);
}

.app-sidebar-children {
  overflow: hidden;
}

.sidebar-children-enter-active,
.sidebar-children-leave-active {
  overflow: hidden;
  transition:
    height 180ms cubic-bezier(0.16, 1, 0.3, 1),
    opacity 140ms ease;
}

.sidebar-children-enter-from,
.sidebar-children-leave-to {
  opacity: 0;
}

.app-sidebar-link {
  display: grid;
  grid-template-columns: 20px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 40px;
  min-width: 0;
  overflow: hidden;
  position: relative;
  border: 0;
  border-radius: var(--radius-control);
  background: transparent;
  padding: 0 10px;
  color: var(--nav-item-text);
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  font-weight: 650;
  text-align: left;
  text-decoration: none;
  transition: background-color 80ms ease, color 80ms ease;
}

.nested .app-sidebar-link {
  grid-template-columns: 20px minmax(0, 1fr);
  min-height: 30px;
  border-radius: var(--radius-subcontrol);
  padding: 0 8px;
  color: var(--text-tertiary);
  font-size: 12px;
  font-weight: 650;
}

.app-sidebar-link.with-count {
  grid-template-columns: 20px minmax(0, 1fr) auto;
}

.nested .app-sidebar-link.with-count {
  grid-template-columns: 20px minmax(0, 1fr) auto;
}

.app-sidebar-link.with-collapse {
  grid-template-columns: 20px minmax(0, 1fr) auto;
}

.nested .app-sidebar-link.with-collapse {
  grid-template-columns: 20px minmax(0, 1fr) auto;
}

.app-sidebar-link.with-count.with-collapse {
  grid-template-columns: 20px minmax(0, 1fr) auto auto;
}

.nested .app-sidebar-link.with-count.with-collapse {
  grid-template-columns: 20px minmax(0, 1fr) auto auto;
}

.app-sidebar-link.collapsed {
  grid-template-columns: 1fr;
  place-items: center;
  min-height: 42px;
  padding: 0;
}

.app-sidebar-link:hover {
  background: var(--nav-item-hover-bg);
  color: var(--nav-item-hover-text);
}

.app-sidebar-link.disabled:hover {
  background: transparent;
  color: var(--nav-item-text);
}

.app-sidebar-link.disabled,
.app-sidebar-link:disabled,
.app-sidebar-link[aria-disabled="true"] {
  background: transparent;
  color: var(--nav-item-text);
  cursor: not-allowed;
  opacity: 0.42;
  box-shadow: none;
}

.app-sidebar-link.active {
  background: var(--state-primary-soft-bg);
  color: var(--state-primary-soft-text);
  box-shadow: none;
}

.app-sidebar-link.active::before {
  display: none;
}

.app-sidebar-link.active:hover {
  background: var(--state-primary-soft-bg-hover);
  color: var(--state-primary-soft-text);
}

.app-sidebar-icon {
  width: 20px;
  height: 20px;
  color: currentColor;
  opacity: 0.9;
}

.app-sidebar-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: opacity 100ms ease;
}

.app-sidebar-text.hidden,
.app-sidebar-count.hidden,
.app-sidebar-notification-dot.hidden,
.app-sidebar-chevron.hidden {
  opacity: 0;
}

.app-sidebar-chevron {
  width: 16px;
  height: 16px;
  color: currentColor;
  opacity: 0.75;
  transition: transform 80ms ease, color 80ms ease;
}

.app-sidebar-chevron.open {
  transform: rotate(180deg);
}

.app-sidebar-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 20px;
  border-radius: 999px;
  background: var(--nav-count-bg);
  padding: 0 7px;
  color: currentColor;
  font-size: 11px;
  font-weight: 800;
  line-height: 1;
}

.app-sidebar-count[data-color="primary"],
.app-sidebar-notification-dot[data-color="primary"],
.app-sidebar-collapsed-notification[data-color="primary"] {
  --menu-notification-bg: var(--badge-primary-soft-bg);
  --menu-notification-text: var(--badge-primary-soft-text);
}

.app-sidebar-count[data-color="success"],
.app-sidebar-notification-dot[data-color="success"],
.app-sidebar-collapsed-notification[data-color="success"] {
  --menu-notification-bg: var(--badge-success-soft-bg);
  --menu-notification-text: var(--badge-success-soft-text);
}

.app-sidebar-count[data-color="warning"],
.app-sidebar-notification-dot[data-color="warning"],
.app-sidebar-collapsed-notification[data-color="warning"] {
  --menu-notification-bg: var(--badge-warning-soft-bg);
  --menu-notification-text: var(--badge-warning-soft-text);
}

.app-sidebar-count[data-color="error"],
.app-sidebar-notification-dot[data-color="error"],
.app-sidebar-collapsed-notification[data-color="error"] {
  --menu-notification-bg: var(--badge-danger-soft-bg);
  --menu-notification-text: var(--badge-danger-soft-text);
}

.app-sidebar-count[data-color="info"],
.app-sidebar-notification-dot[data-color="info"],
.app-sidebar-collapsed-notification[data-color="info"] {
  --menu-notification-bg: var(--badge-info-soft-bg);
  --menu-notification-text: var(--badge-info-soft-text);
}

.app-sidebar-count[data-color="neutral"],
.app-sidebar-notification-dot[data-color="neutral"],
.app-sidebar-collapsed-notification[data-color="neutral"] {
  --menu-notification-bg: var(--badge-neutral-soft-bg);
  --menu-notification-text: var(--badge-neutral-soft-text);
}

.app-sidebar-count[data-color] {
  background: var(--menu-notification-bg, var(--nav-count-bg));
  color: var(--menu-notification-text, currentColor);
}

.app-sidebar-link.active .app-sidebar-count {
  background: var(--state-primary-soft-bg-hover);
  color: var(--state-primary-soft-text);
}

.app-sidebar-notification-dot,
.app-sidebar-collapsed-notification {
  display: inline-flex;
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: var(--menu-notification-bg, var(--badge-primary-bg));
  box-shadow: 0 0 0 2px var(--nav-item-bg, transparent);
}

.app-sidebar-collapsed-notification {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 7px;
  height: 7px;
}

.app-sidebar-dot {
  width: 4px;
  height: 4px;
  border-radius: 999px;
  background: currentColor;
  opacity: 0.42;
}

.app-sidebar-link.active .app-sidebar-dot {
  opacity: 0.85;
}
</style>
