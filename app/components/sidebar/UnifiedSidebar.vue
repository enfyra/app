<script setup lang="ts">
const route = useRoute();
const router = useRouter();
const { menuGroups } = useMenuRegistry();
const { checkPermissionCondition } = usePermissions();
const { width } = useScreen();
const { sidebarVisible, setSidebarVisible, settings } = useGlobalState();
const { getFileUrl } = useFileUrl();
const { metadataReloading } = useAdminSocket();

if (import.meta.client) {
  const saved = localStorage.getItem('sidebar-open');
  if (saved !== null && width.value > 1024) {
    sidebarVisible.value = saved === 'true';
  }
}

watch(sidebarVisible, (val) => {
  if (import.meta.client && width.value > 1024) {
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

const visibleGroups = computed(() => {
  return menuGroups.value
    .filter(group => !group.permission || checkPermissionCondition(group.permission))
    .map(group => {
      const permittedItems = group.items?.filter((item: any) =>
        !item.permission || checkPermissionCondition(item.permission)
      ) || [];
      return { ...group, items: permittedItems };
    });
});

function isRouteActive(itemRoute?: string): boolean {
  if (!itemRoute) return false;
  const currentPath = route.path;
  return currentPath === itemRoute ||
    (currentPath.startsWith(itemRoute) && (currentPath[itemRoute.length] === '/' || currentPath[itemRoute.length] === undefined));
}

function convertItem(item: any): any {
  const itemRoute = item.route || item.path || undefined;
  const result: any = {
    label: item.label,
    icon: item.icon || 'lucide:circle',
  };

  if (item.type === 'Dropdown Menu' && item.items?.length) {
    result.children = item.items.map((child: any) => {
      const childRoute = child.route || child.path || undefined;
      return {
        label: child.label,
        icon: child.icon || 'lucide:circle',
        to: childRoute,
        active: isRouteActive(childRoute),
      };
    });
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
    if (group.type === 'Menu') {
      const groupRoute = group.route || group.path || undefined;
      groups.push([{
        label: group.label,
        icon: group.icon,
        to: groupRoute,
        active: isRouteActive(groupRoute),
      }]);
      continue;
    }

    if (!group.items || group.items.length === 0) continue;

    const items: any[] = [
      { label: group.label, type: 'label' as const },
    ];

    for (const item of group.items) {
      items.push(convertItem(item));
    }

    groups.push(items);
  }

  return groups;
});

const componentGroups = computed(() => {
  return visibleGroups.value.filter(g => g.position !== 'bottom' && g.component);
});

const bottomGroups = computed(() => {
  return visibleGroups.value.filter(g => g.position === 'bottom');
});

const isDesktopCollapsed = computed(() => !sidebarVisible.value && width.value > 1024);

const scrollAnchor = ref<HTMLElement | null>(null);
const canScrollDown = ref(false);
let scrollEl: Element | null = null;

function checkScroll() {
  if (!scrollEl) return;
  canScrollDown.value = scrollEl.scrollTop + scrollEl.clientHeight < scrollEl.scrollHeight - 8;
}

onMounted(() => {
  nextTick(() => {
    scrollEl = scrollAnchor.value?.closest('[data-slot="body"]') || null;
    if (scrollEl) {
      scrollEl.addEventListener('scroll', checkScroll, { passive: true });
      checkScroll();
    }
  });
});

onUnmounted(() => {
  if (scrollEl) scrollEl.removeEventListener('scroll', checkScroll);
});

watch(navigationItems, () => nextTick(checkScroll), { deep: true });

router.afterEach(() => {
  if (width.value <= 1024) {
    setSidebarVisible(false);
  }
});
</script>

<template>
  <USidebar
    v-model:open="sidebarVisible"
    variant="inset"
    collapsible="icon"
    :style="{ '--sidebar-width': '290px' }"
    :ui="{
      container: 'h-full !z-[99999] pb-4 pl-2',
      body: 'flex min-h-0 flex-1 flex-col gap-4 !overflow-y-auto border-0',
      footer: 'flex flex-col gap-1.5 overflow-hidden w-full p-0 max-lg:p-2',
    }"
  >
    <template #title="{ state }">
      <div class="flex items-center gap-3 overflow-hidden">
        <div class="relative w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
          <UIcon v-if="metadataReloading" name="lucide:loader-circle" class="text-primary animate-spin" size="20" />
          <img v-else-if="faviconUrl" :src="faviconUrl" alt="Favicon" class="w-full h-full object-cover" />
          <UIcon v-else name="lucide:database" class="w-5 h-5 text-primary" />
        </div>
        <template v-if="state === 'expanded'">
          <span class="font-semibold text-sm truncate">{{ settings?.projectName || 'Enfyra' }}</span>
        </template>
      </div>
    </template>
    <template #description="{ state }">
      <p v-if="state === 'expanded'" class="text-xs text-[var(--text-quaternary)] truncate ps-11">{{ settings?.projectDescription || 'CMS' }}</p>
    </template>

    <template #default="{ state }">
      <div v-for="group in componentGroups" :key="group.id" class="mb-3">
        <component v-if="state === 'expanded'" :is="group.component" v-bind="group.componentProps || {}" />
      </div>

      <UNavigationMenu
        :items="navigationItems"
        orientation="vertical"
        :collapsed="state === 'collapsed'"
        :tooltip="state === 'collapsed'"
        highlight
        highlight-color="primary"
        color="primary"
        :ui="{
          list: 'isolate min-w-0 space-y-1',
          link: 'py-2 px-2.5 overflow-hidden gap-2.5 after:w-[2px] group-data-[state=collapsed]/sidebar:after:hidden group-data-[state=collapsed]/sidebar:py-1 group-data-[state=collapsed]/sidebar:px-1.5',
          linkLeadingIcon: 'size-5 shrink-0 text-[var(--text-quaternary)]',
          separator: 'my-3 border-b border-[var(--border-default)] group-data-[state=collapsed]/sidebar:my-1',
          childList: 'ms-[13px] border-s-2 border-primary/30 space-y-0.5 group-data-[state=collapsed]/sidebar:border-transparent group-data-[state=collapsed]/sidebar:ms-0',
          childItem: 'ps-1.5 -ms-px',
          childLink: 'py-1.5 px-2.5',
        }"
      />

      <div ref="scrollAnchor" />

      <div
        v-if="canScrollDown && state === 'expanded'"
        class="sticky bottom-0 w-full flex items-center justify-center pointer-events-none py-0.5"
      >
        <UIcon name="lucide:chevrons-down" class="w-3.5 h-3.5 text-[var(--text-quaternary)] animate-bounce" />
      </div>
    </template>

    <template #footer>
      <template v-for="group in bottomGroups" :key="group.id" >
        <PermissionGate :condition="group.permission as any">
          <component
            v-if="group.component"
            :is="group.component"
            v-bind="{ ...(group.componentProps || {}), collapsed: isDesktopCollapsed }"
          />
        </PermissionGate>
      </template>
    </template>
  </USidebar>
</template>
