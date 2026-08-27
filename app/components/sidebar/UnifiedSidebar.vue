<script setup lang="ts">
import { useScrollLock } from '@vueuse/core';

const route = useRoute();
const router = useRouter();
const { menuGroups } = useMenuRegistry();
const { menuDefinitionsPending } = useMenuApi();
const { routesLoading, routesFetched } = useRoutes();
const { hasMenuPermission } = usePermissions();
const { width } = useScreen();
const { sidebarVisible, setSidebarVisible, settings } = useGlobalState();
const { getFileUrl } = useFileUrl();
const suppressSidebarPersist = ref(false);
const showMenuSkeleton = ref(false);
let menuSkeletonTimer: ReturnType<typeof setTimeout> | null = null;

if (import.meta.client) {
  const saved = localStorage.getItem('sidebar-open');
  if (saved !== null && width.value >= 1024) {
    sidebarVisible.value = saved === 'true';
  }
}

watch(sidebarVisible, (val) => {
  if (!suppressSidebarPersist.value && import.meta.client && width.value >= 1024) {
    localStorage.setItem('sidebar-open', String(val));
  }
});

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
    return {
      id: item.id,
      label: item.label,
      icon: item.icon || 'lucide:database',
      to: '/data',
      active: isRouteActive('/data'),
      count: item.count || item.badge,
      loading: routesLoading.value && !routesFetched.value,
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
      groups.push([{
        id: group.id,
        label: group.label,
        icon: group.icon || 'lucide:database',
        to: '/data',
        active: isRouteActive('/data'),
        count: group.count || group.badge,
        loading: routesLoading.value && !routesFetched.value,
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

function collectTopLevelRailItems(items: any[]): any[] {
  return items.map((item) => ({
    ...item,
    children: undefined,
    collapsible: false,
  }));
}

const collapsedRailItems = computed(() => collectTopLevelRailItems(navigationItems.value.flat()));

const componentGroups = computed(() => {
  return visibleGroups.value.filter(g => g.position !== 'bottom' && g.component);
});

const bottomGroups = computed(() => {
  return visibleGroups.value.filter(g => g.position === 'bottom');
});

const isMobile = computed(() => width.value < 1024);
const documentScrollLocked = useScrollLock(import.meta.client ? document.documentElement : null);

watch([isMobile, sidebarVisible], ([mobile, visible]) => {
  documentScrollLocked.value = mobile && visible;
}, { immediate: true });

const isDesktopCollapsed = computed(() => !isMobile.value && !sidebarVisible.value);
const hoverOpenedSidebar = ref(false);
const sidebarPointerInside = ref(false);
let peekLeaveTimer: ReturnType<typeof setTimeout> | null = null;

function setSidebarVisibleTransient(value: boolean) {
  suppressSidebarPersist.value = true;
  sidebarVisible.value = value;
  nextTick(() => {
    suppressSidebarPersist.value = false;
  });
}

function showSidebarPeek() {
  if (peekLeaveTimer) {
    clearTimeout(peekLeaveTimer);
    peekLeaveTimer = null;
  }
  if (!isDesktopCollapsed.value) return;
  hoverOpenedSidebar.value = true;
  setSidebarVisibleTransient(true);
}

function hideSidebarPeek() {
  if (!hoverOpenedSidebar.value) return;
  if (peekLeaveTimer) {
    clearTimeout(peekLeaveTimer);
  }
  peekLeaveTimer = setTimeout(() => {
    hoverOpenedSidebar.value = false;
    setSidebarVisibleTransient(false);
    peekLeaveTimer = null;
  }, 120);
}

function handleSidebarMouseEnter() {
  sidebarPointerInside.value = true;
  showSidebarPeek();
}

function handleSidebarMouseLeave() {
  sidebarPointerInside.value = false;
  hideSidebarPeek();
}

function handleSidebarFocusOut(event: FocusEvent) {
  if (sidebarPointerInside.value) return;
  const nextTarget = event.relatedTarget;
  const currentTarget = event.currentTarget;
  if (nextTarget instanceof Node && currentTarget instanceof HTMLElement && currentTarget.contains(nextTarget)) return;
  hideSidebarPeek();
}

const renderExpandedSidebarContent = computed(() => {
  if (!sidebarVisible.value) return false;
  return true;
});

const showExpandedSidebarLabels = computed(() => {
  return sidebarVisible.value;
});

router.afterEach(() => {
  if (width.value < 1024) {
    setSidebarVisible(false);
  }
});

onUnmounted(() => {
  if (menuSkeletonTimer) {
    clearTimeout(menuSkeletonTimer);
  }
  if (peekLeaveTimer) {
    clearTimeout(peekLeaveTimer);
    peekLeaveTimer = null;
  }
});
</script>

<template>
  <div class="relative sticky top-0 h-dvh self-start" @mouseenter="handleSidebarMouseEnter" @mouseleave="handleSidebarMouseLeave" @focusin="showSidebarPeek" @focusout="handleSidebarFocusOut">
    <USidebar
      v-model:open="sidebarVisible"
      variant="sidebar"
      collapsible="icon"
      class="eapp-sidebar"
      :style="{ '--sidebar-width': '280px' }"
      :ui="{
        gap: '!duration-[120ms]',
        container: 'h-full !z-[99999] !duration-[140ms]',
        inner: '!bg-[var(--shell-sidebar-bg)] !border-r !border-[var(--shell-sidebar-border)] !divide-transparent backdrop-blur-xl shadow-none',
       header: 'px-3.5 pb-2.5 pt-4 group-data-[state=collapsed]/sidebar:px-2',
        body: 'flex min-h-0 flex-1 flex-col gap-4 !overflow-y-auto border-0 px-3.5 group-data-[state=collapsed]/sidebar:px-2',
        footer: 'flex min-h-0 w-full flex-col gap-1.5 overflow-y-auto p-0 px-3.5 pb-5 max-lg:pb-4 group-data-[state=collapsed]/sidebar:px-2',
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
        <div v-for="group in componentGroups" :key="group.id" class="mb-3">
          <component v-if="renderExpandedSidebarContent" :is="group.component" v-bind="group.componentProps || {}" />
        </div>

        <nav class="app-sidebar-nav" aria-label="Main navigation">
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
              <SidebarMenuTree
                v-for="(group, groupIndex) in (!renderExpandedSidebarContent ? [collapsedRailItems] : navigationItems)"
                :key="groupIndex"
                :items="group"
                :collapsed="!renderExpandedSidebarContent"
                :labels-visible="showExpandedSidebarLabels"
              />
            </div>
          </Transition>
          </div>
        </nav>
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
  </div>
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

.eapp-sidebar:deep([data-slot="container"]) {
  transition-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
}
</style>
