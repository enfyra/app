<script setup lang="ts">
const route = useRoute();
const router = useRouter();
const { menuGroups } = useMenuRegistry();
const { checkPermissionCondition } = usePermissions();
const { width } = useScreen();
const { sidebarVisible, setSidebarVisible, settings } = useGlobalState();
const { getFileUrl } = useFileUrl();
const suppressSidebarPersist = ref(false);
const hoverOpenedSidebar = ref(false);

if (import.meta.client) {
  const saved = localStorage.getItem('sidebar-open');
  if (saved !== null && width.value >= 1024) {
    sidebarVisible.value = saved === 'true';
  }
}

watch(sidebarVisible, (val) => {
  if (suppressSidebarPersist.value) return;
  if (import.meta.client && width.value >= 1024) {
    localStorage.setItem('sidebar-open', String(val));
  }
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
  return items
    .filter((item: any) => !item.permission || checkPermissionCondition(item.permission))
    .map((item: any) => ({
      ...item,
      items: filterPermittedItems(item.items || []),
    }));
}

const visibleGroups = computed(() => {
  return menuGroups.value
    .filter(group => !group.permission || checkPermissionCondition(group.permission))
    .map(group => {
      const permittedItems = filterPermittedItems(group.items || []);
      return { ...group, items: permittedItems };
    });
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
    if (!group.items || group.items.length === 0) {
      const groupRoute = group.route || group.path || undefined;
      if (!groupRoute) continue;
      groups.push([{
        label: group.label,
        icon: group.icon,
        to: groupRoute,
        active: isRouteActive(groupRoute),
        count: group.count || group.badge,
        collapsible: group.type === 'Dropdown Menu',
        children: [],
      }]);
      continue;
    }

    groups.push([convertItem(group)]);
  }

  return groups;
});

function collectRailItems(items: any[]): any[] {
  return items.flatMap((item) => {
    const children = item.children?.length ? collectRailItems(item.children) : [];
    if (item.to && !item.collapsible) {
      return [{ ...item, children: undefined, collapsible: false }, ...children];
    }
    return children;
  });
}

const collapsedRailItems = computed(() => collectRailItems(navigationItems.value.flat()));

const componentGroups = computed(() => {
  return visibleGroups.value.filter(g => g.position !== 'bottom' && g.component);
});

const bottomGroups = computed(() => {
  return visibleGroups.value.filter(g => g.position === 'bottom');
});

const isMobile = computed(() => width.value < 1024);
const isDesktopCollapsed = computed(() => !isMobile.value && !sidebarVisible.value);

function setSidebarVisibleTransient(value: boolean) {
  suppressSidebarPersist.value = true;
  sidebarVisible.value = value;
  nextTick(() => {
    suppressSidebarPersist.value = false;
  });
}

function showSidebarPeek() {
  if (isDesktopCollapsed.value) {
    hoverOpenedSidebar.value = true;
    setSidebarVisibleTransient(true);
  }
}

function hideSidebarPeek() {
  if (!hoverOpenedSidebar.value) return;
  hoverOpenedSidebar.value = false;
  setSidebarVisibleTransient(false);
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
  hideSidebarPeek();
});
</script>

<template>
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
      header: 'px-[18px] pb-3 pt-6 group-data-[state=collapsed]/sidebar:px-2',
      body: 'flex min-h-0 flex-1 flex-col gap-5 !overflow-y-auto border-0 px-[18px] group-data-[state=collapsed]/sidebar:px-3',
      footer: 'flex flex-col gap-1.5 overflow-hidden w-full p-0 px-[18px] pb-7 max-lg:pb-4 group-data-[state=collapsed]/sidebar:px-3',
    }"
    @mouseenter="showSidebarPeek"
    @mouseleave="hideSidebarPeek"
    @focusin="showSidebarPeek"
  >
    <template #title="{ state }">
      <div
        class="flex min-w-0 items-center overflow-hidden"
        :class="!renderExpandedSidebarContent ? 'w-full justify-center gap-0 px-0' : 'gap-3 px-1.5'"
      >
        <div class="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius-control)] bg-[var(--nav-item-active-bg)] text-[var(--nav-count-active-text)] shadow-[var(--shadow-md)] ring-1 ring-[var(--nav-item-active-ring)]">
          <img v-if="faviconUrl" :src="faviconUrl" alt="Favicon" class="w-full h-full object-cover" />
          <UIcon v-else name="lucide:blocks" class="h-5 w-5" />
        </div>
        <div v-if="renderExpandedSidebarContent" class="min-w-0 flex-1 transition-opacity duration-100" :class="{ 'opacity-0': !showExpandedSidebarLabels }">
          <p class="m-0 truncate text-[15px] font-bold leading-5 text-[var(--text-primary)]">{{ settings?.projectName || 'Enfyra' }}</p>
          <p class="m-0 mt-0.5 truncate text-xs font-medium leading-4 text-[var(--text-tertiary)]">{{ settings?.projectDescription || 'Control plane' }}</p>
        </div>
      </div>
    </template>
    <template #description />

    <template #default="{ state }">
      <div v-for="group in componentGroups" :key="group.id" class="mb-3">
        <component v-if="renderExpandedSidebarContent" :is="group.component" v-bind="group.componentProps || {}" />
      </div>

      <nav class="app-sidebar-nav" aria-label="Main navigation">
        <SidebarMenuTree
          v-for="(group, groupIndex) in (!renderExpandedSidebarContent ? [collapsedRailItems] : navigationItems)"
          :key="groupIndex"
          :items="group"
          :collapsed="!renderExpandedSidebarContent"
          :labels-visible="showExpandedSidebarLabels"
        />
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
</template>

<style scoped>
.app-sidebar-nav {
  display: grid;
  gap: 8px;
  min-width: 0;
}

.eapp-sidebar:deep([data-slot="container"]) {
  transition-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
}
</style>
