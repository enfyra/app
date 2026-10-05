<script setup lang="ts">
import type { DropdownMenuItem, NavigationMenuItem } from '@nuxt/ui';
import { UDropdownMenu, UTooltip } from '#components';
import { selectSidebarCollections } from '~/utils/sidebar-collection-items';

const route = useRoute();
const router = useRouter();
const { menuGroups } = useMenuRegistry();
const { menuDefinitionsPending } = useMenuApi();
const { routesLoading, routesFetched } = useRoutes();
const { sidebarCollections } = useDataCollectionPreferences();
const { hasMenuPermission } = usePermissions();
const { width } = useScreen();
const { sidebarVisible, setSidebarVisible, settings } = useGlobalState();
const accountSheetOpen = useState('account-sheet-open', () => false);
const { getFileUrl } = useFileUrl();
const showMenuSkeleton = ref(false);
const { getMenuNotification } = useMenuNotificationRegistry();
const { schedulePrefetchIntent, cancelPrefetchIntent } = useExtensionPrefetch();
const openMenuKeys = useState<Record<string, boolean>>('sidebar-menu-open-keys', () => ({}));
let menuSkeletonTimer: ReturnType<typeof setTimeout> | null = null;

if (import.meta.client) {
  const saved = localStorage.getItem('sidebar-open');
  if (saved !== null && width.value >= 1024) {
    sidebarVisible.value = saved === 'true';
  }
  try {
    const savedKeys = localStorage.getItem('sidebar-menu-open-keys');
    if (savedKeys) openMenuKeys.value = JSON.parse(savedKeys);
  } catch {}
}

watch(sidebarVisible, (val) => {
  if (import.meta.client && width.value >= 1024) {
    localStorage.setItem('sidebar-open', String(val));
  }
});

watch(openMenuKeys, (value) => {
  if (import.meta.client) localStorage.setItem('sidebar-menu-open-keys', JSON.stringify(value));
}, { deep: true });

watch(menuDefinitionsPending, (pending) => {
  if (menuSkeletonTimer) {
    clearTimeout(menuSkeletonTimer);
    menuSkeletonTimer = null;
  }

  if (pending) {
    showMenuSkeleton.value = true;
    return;
  }

  menuSkeletonTimer = setTimeout(() => {
    showMenuSkeleton.value = false;
    menuSkeletonTimer = null;
  }, 180);
});

const faviconUrl = computed(() => {
  if (!settings.value?.projectFavicon) return null;
  const favicon = settings.value.projectFavicon;
  if (favicon.startsWith('http://') || favicon.startsWith('https://') || favicon.startsWith('/')) {
    return favicon;
  }
  return getFileUrl(favicon);
});

function filterPermittedItems(items: any[] = []): any[] {
  return items.reduce<any[]>((visible, item: any) => {
    const children = filterPermittedItems(item.items || []);
    if (hasMenuPermission(item) || children.length > 0) {
      visible.push({ ...item, items: children });
    }
    return visible;
  }, []);
}

const visibleGroups = computed(() => {
  return menuGroups.value.reduce<any[]>((visible, group) => {
    const permittedItems = filterPermittedItems(group.items || []);
    if (hasMenuPermission(group) || permittedItems.length > 0) {
      visible.push({ ...group, items: permittedItems });
    }
    return visible;
  }, []);
});

function isRouteActive(itemRoute?: string): boolean {
  if (!itemRoute) return false;
  const currentPath = route.path;
  return currentPath === itemRoute ||
    (currentPath.startsWith(itemRoute) && (currentPath[itemRoute.length] === '/' || currentPath[itemRoute.length] === undefined));
}

function isRouteExactActive(itemRoute?: string): boolean {
  if (!itemRoute) return false;
  return route.path === itemRoute;
}

function convertItem(item: any): any {
  const itemRoute = item.route || item.path || undefined;
  const isDataItem = item.id === "data" || itemRoute === "/data" || item.label === "Data";

  if (isDataItem) {
    const children = item.items?.map(convertItem) ?? [];
    return {
      id: item.id,
      label: item.label,
      icon: item.icon || 'lucide:database',
      to: '/data',
      active: isRouteExactActive('/data'),
      count: item.count || item.badge,
      loading: routesLoading.value && !routesFetched.value,
      children,
      branchActive: children.some((child: any) => child.active || child.branchActive),
    };
  }

  const result: any = {
    id: item.id,
    label: item.label,
    icon: item.icon || 'lucide:circle',
    count: item.count || item.badge,
  };

  if (item.items?.length) {
    const parentActive = isRouteExactActive(itemRoute);
    result.children = item.items.map(convertItem);
    result.active = parentActive;
    result.branchActive = result.children.some((child: any) => child.active || child.branchActive);
    result.defaultOpen = true;
  } else {
    result.to = itemRoute;
    result.active = isRouteActive(itemRoute);
  }

  return result;
}

const navigationItems = computed(() => {
  const topGroups = visibleGroups.value.filter(g => g.position !== 'bottom' && !g.component);

  const groups: any[][] = [];

  for (const group of topGroups) {
    const groupRoute = group.route || group.path || undefined;
    const isDataGroup = group.id === "data" || groupRoute === "/data" || group.label === "Data";

    if (isDataGroup) {
      const children = group.items?.map(convertItem) ?? [];
      groups.push([{
        id: group.id,
        label: group.label,
        icon: group.icon || 'lucide:database',
        to: '/data',
        active: isRouteExactActive('/data'),
        count: group.count || group.badge,
        loading: routesLoading.value && !routesFetched.value,
        children,
        branchActive: children.some((child: any) => child.active || child.branchActive),
      }]);
      continue;
    }

    if (!group.items || group.items.length === 0) {
      if (!groupRoute) continue;
      groups.push([{
        id: group.id,
        label: group.label,
        icon: group.icon,
        to: groupRoute,
        active: isRouteActive(groupRoute),
        count: group.count || group.badge,
        collapsible: group.type === 'Dropdown Menu',
        children: [],
        loading: isDataGroup && routesLoading.value && !routesFetched.value,
      }]);
      continue;
    }

    groups.push([convertItem(group)]);
  }

  return groups;
});

function menuBadge(item: any) {
  const notification = getMenuNotification(item);
  const value = item.count ?? notification?.value;
  if (value != null) return { label: String(value), color: notification?.color ?? 'primary', variant: 'soft' as const };
  return notification ? { label: '•', color: notification.color, variant: 'soft' as const } : undefined;
}

function dataMenuItems(items: any[]): NavigationMenuItem[] {
  return [
    ...selectSidebarCollections(items, sidebarCollections.value.maxVisible, sidebarCollections.value.pinned).map(toNavigationItem),
    { label: `Browse all ${items.length}`, icon: 'lucide:layout-grid', to: '/data' },
  ];
}

function toNavigationItem(item: any): NavigationMenuItem {
  const isDataParent = item.id === 'data' || item.to === '/data';
  const children = isDataParent && item.children?.length ? dataMenuItems(item.children) : item.children?.map(toNavigationItem);
  const key = String(item.to || item.label);
  const hasChildren = Boolean(children?.length);
  return {
    label: item.label,
    icon: item.icon,
    value: key,
    ...(item.to && !hasChildren ? { to: item.to } : {}),
    ...(hasChildren ? {
      children,
      defaultOpen: openMenuKeys.value[key] ?? Boolean(item.active || item.branchActive),
      onClick: (event: MouseEvent) => rememberBranchState(key, event),
    } : {}),
    active: item.active,
    badge: menuBadge(item),
    ...(isDataParent && item.loading && !hasChildren ? { disabled: true } : {}),
  };
}

function prefetchMenuIntent(event: Event) {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const link = target.closest('a[data-slot="link"], a[data-slot="childLink"]');
  if (link instanceof HTMLAnchorElement) schedulePrefetchIntent(link.getAttribute('href') || undefined);
}

function groupOpenValues(group: NavigationMenuItem[]): string[] {
  return group.filter(item => item.children?.length && item.defaultOpen)
    .map(item => String(item.value));
}

function rememberBranchState(key: string, event: Event) {
  const trigger = event.currentTarget;
  if (!(trigger instanceof HTMLElement) || trigger.tagName !== 'BUTTON') return;
  void nextTick(() => {
    openMenuKeys.value = {
      ...openMenuKeys.value,
      [key]: trigger.getAttribute('aria-expanded') === 'true',
    };
  });
}

function toCollapsedMenuItem(item: NavigationMenuItem): DropdownMenuItem {
  return {
    label: item.label,
    icon: item.icon,
    disabled: item.disabled,
    badge: item.badge,
    ...(item.children?.length
      ? { children: item.children.map(toCollapsedMenuItem) }
      : { to: item.to }),
    ...(item.active ? { class: '!text-[var(--text-primary)] before:!bg-[var(--menu-item-hover-bg)]' } : {}),
  };
}

const nativeNavigationItems = computed<NavigationMenuItem[][]>(() => navigationItems.value.map(group => group.map(toNavigationItem)));
const navigationMenuUi = {
  root: 'w-full',
  list: 'gap-1',
  link: 'min-h-9 rounded-[var(--radius-control)] px-2.5 py-1.5 !text-[13px]',
  linkLeadingIcon: 'size-5 shrink-0',
  linkLabel: 'truncate',
  childList: 'border-[var(--nav-child-border)]',
  childLink: 'min-h-8 items-center rounded-[var(--radius-subcontrol)] px-2.5 py-1.5 !text-xs',
};

const componentGroups = computed(() => {
  return visibleGroups.value.filter(g => g.position !== 'bottom' && g.component);
});

const bottomGroups = computed(() => {
  return visibleGroups.value.filter(g => g.position === 'bottom');
});

const renderExpandedSidebarContent = computed(() => sidebarVisible.value);
const showExpandedSidebarLabels = computed(() => sidebarVisible.value);

router.afterEach(() => {
  if (width.value < 1024) {
    setSidebarVisible(false);
  }
});

onUnmounted(() => {
  if (menuSkeletonTimer) {
    clearTimeout(menuSkeletonTimer);
  }
});
</script>

<template>
  <USidebar
    v-model:open="sidebarVisible"
    variant="inset"
    :menu="{ dismissible: !accountSheetOpen, ui: { overlay: 'z-40', content: 'z-40 max-w-none' } }"
    collapsible="icon"
    class="eapp-sidebar"
    :style="{ '--sidebar-width': 'var(--shell-sidebar-width)' }"
    :ui="{
      container: 'py-[var(--shell-sidebar-inset)]',
      inner: '!bg-[var(--shell-sidebar-bg)] !border-0 !divide-transparent shadow-none',
      header: 'px-3.5 pb-2.5 pt-4 lg:py-0 group-data-[state=collapsed]/sidebar:px-2',
      body: '!overflow-hidden border-0 p-0',
      footer: 'eapp-sidebar-scroll flex min-h-0 w-full flex-col gap-1.5 overflow-x-hidden overflow-y-auto border-t border-[var(--nav-child-border)] px-3.5 pt-3 pb-4 lg:pb-0 group-data-[state=collapsed]/sidebar:px-2',
    }"
  >
    <template #title>
      <div
        class="flex min-w-0 items-center overflow-hidden"
        :class="!renderExpandedSidebarContent ? 'w-full justify-center gap-0 px-0' : 'gap-3 px-1.5'"
      >
        <div class="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius-control)] border border-[var(--brand-700)] bg-[var(--nav-item-active-bg)] text-[var(--nav-count-active-text)] shadow-[var(--shadow-md)]">
          <img v-if="faviconUrl" :src="faviconUrl" alt="Favicon" class="w-full h-full object-cover" />
          <UIcon v-else name="lucide:blocks" class="h-5 w-5" />
        </div>
        <div v-if="renderExpandedSidebarContent" class="min-w-0 flex-1 transition-opacity duration-[var(--duration-instant)]" :class="{ 'opacity-0': !showExpandedSidebarLabels }">
          <p class="m-0 truncate text-[15px] font-bold leading-5 text-[var(--text-primary)]">{{ settings?.projectName || 'Enfyra' }}</p>
          <p class="m-0 mt-0.5 truncate text-xs font-medium leading-4 text-[var(--text-tertiary)]">{{ settings?.projectDescription || 'Control plane' }}</p>
        </div>
      </div>
    </template>
    <template #description />

    <template #default>
      <SidebarScrollArea :collapsed="!renderExpandedSidebarContent">
        <div v-for="group in componentGroups" :key="group.id" class="mb-3">
          <component v-if="renderExpandedSidebarContent" :is="group.component" v-bind="group.componentProps || {}" />
        </div>

        <nav class="app-sidebar-nav" aria-label="Main navigation" @pointerover="prefetchMenuIntent" @pointerout="cancelPrefetchIntent" @focusin="prefetchMenuIntent" @focusout="cancelPrefetchIntent">
          <div class="sidebar-menu-stack">
            <Transition name="sidebar-menu-loading">
              <div
                v-if="showMenuSkeleton"
                key="menu-skeleton"
                class="app-sidebar-menu-skeleton"
                :class="{ collapsed: !renderExpandedSidebarContent }"
                aria-label="Loading navigation"
              >
                <div
                  v-for="i in 7"
                  :key="i"
                  class="app-sidebar-menu-skeleton-row"
                >
                  <div class="app-sidebar-menu-skeleton-icon skeleton-gradient skeleton-pulse-slow" />
                  <div
                    v-if="renderExpandedSidebarContent"
                    class="app-sidebar-menu-skeleton-label skeleton-gradient skeleton-pulse-slow"
                    :style="{ width: `${64 + (i % 4) * 12}%` }"
                  />
                </div>
              </div>

              <div v-else key="menu-tree" class="app-sidebar-menu-tree">
                <template v-for="(group, groupIndex) in nativeNavigationItems" :key="groupIndex">
                  <USeparator
                    v-if="groupIndex > 0 && (group.some(item => item.children?.length) || nativeNavigationItems[groupIndex - 1]?.some(item => item.children?.length))"
                    class="-mx-3.5 w-auto"
                    :ui="{ border: 'border-[var(--nav-child-border)]' }"
                  />
                  <UNavigationMenu
                    v-if="renderExpandedSidebarContent"
                    :items="group"
                    :default-value="groupOpenValues(group)"
                    type="multiple"
                    :unmount-on-hide="false"
                    orientation="vertical"
                    variant="pill"
                    color="neutral"
                    highlight
                    :ui="navigationMenuUi"
                  />
                  <ul v-else class="flex flex-col gap-1">
                    <li v-for="item in group" :key="String(item.value)" class="flex justify-center">
                      <component
                        :is="item.children?.length ? UDropdownMenu : UTooltip"
                        v-bind="item.children?.length ? {
                          items: [{ label: item.label, type: 'label' }, ...item.children.map(toCollapsedMenuItem)],
                          content: { side: 'right', align: 'start', sideOffset: 8, collisionPadding: 8 },
                          modal: false,
                          ui: { content: 'w-60', item: 'min-h-9 cursor-pointer pointer-coarse:min-h-[44px]' },
                        } : { text: item.label, content: { side: 'right' } }"
                      >
                        <UButton
                          :icon="item.icon"
                          color="neutral"
                          variant="ghost"
                          :aria-label="item.label"
                          :disabled="item.disabled"
                          :to="item.children?.length ? undefined : item.to"
                          class="mx-auto !size-9 justify-center !p-0"
                          :class="item.active ? '!text-[var(--nav-item-hover-text)] !bg-[var(--nav-item-hover-bg)]' : undefined"
                        />
                        <template #item-label="{ item: child }">
                          <span>{{ child.label }}</span>
                          <UBadge v-if="child.badge" v-bind="child.badge" size="xs" class="ms-2" />
                        </template>
                      </component>
                    </li>
                  </ul>
                </template>
              </div>
            </Transition>
          </div>
        </nav>
      </SidebarScrollArea>
    </template>

    <template #footer>
      <template v-for="group in bottomGroups" :key="group.id" >
        <PermissionGate :condition="group.permission as any">
          <component
            v-if="group.component"
            :is="group.component"
            v-bind="{ ...(group.componentProps || {}), collapsed: !renderExpandedSidebarContent }"
          />
        </PermissionGate>
      </template>
    </template>
  </USidebar>
</template>

<style scoped>
.sidebar-menu-stack {
  display: grid;
}

.sidebar-menu-stack > * {
  grid-area: 1 / 1;
}

.app-sidebar-nav {
  display: grid;
  gap: 8px;
  min-width: 0;
}

.app-sidebar-menu-tree {
  display: grid;
  gap: 8px;
  min-width: 0;
}

.app-sidebar-menu-skeleton {
  display: grid;
  gap: 6px;
  min-width: 0;
}

.app-sidebar-menu-skeleton-row {
  display: grid;
  grid-template-columns: 20px minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  min-height: 32px;
  background: var(--surface-nested);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-control);
  padding: 0 8px;
}

.app-sidebar-menu-skeleton.collapsed .app-sidebar-menu-skeleton-row {
  grid-template-columns: 1fr;
  place-items: center;
  min-height: 36px;
  padding: 0;
}

.app-sidebar-menu-skeleton-icon {
  width: 18px;
  height: 18px;
  border-radius: var(--radius-subcontrol);
}

.app-sidebar-menu-skeleton-label {
  height: 11px;
  min-width: 48px;
  max-width: 148px;
  border-radius: var(--radius-pill);
}

.eapp-sidebar:deep([data-slot="footer"]) {
  padding-bottom: max(1rem, env(safe-area-inset-bottom));
}

@media (min-width: 1024px) {
  .eapp-sidebar:deep([data-slot="footer"]) {
    padding-bottom: max(0px, calc(env(safe-area-inset-bottom) - var(--shell-sidebar-inset)));
  }
}
</style>
