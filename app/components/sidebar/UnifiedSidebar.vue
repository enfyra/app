<script setup lang="ts">
const route = useRoute();
const { menuGroups } = useMenuRegistry();
const { checkPermissionCondition } = usePermissions();
const { isMobile, isTablet, width } = useScreen();
const { setSidebarVisible, sidebarCollapsed, setSidebarCollapsed, settings, sidebarVisible } = useGlobalState();
const isTabletOrMobile = computed(() => width.value <= 1024);
const { getFileUrl } = useFileUrl();

const faviconUrl = computed(() => {
  if (!settings.value?.projectFavicon) return null;
  const favicon = settings.value.projectFavicon;
  if (favicon.startsWith('http://') || favicon.startsWith('https://') || favicon.startsWith('/')) {
    return favicon;
  }
  return getFileUrl(favicon);
});

const isCollapsed = computed(() => {
  if (isMobile.value || isTablet.value) return false;
  return sidebarCollapsed.value;
});

const activeRoutes = computed(() => {
  const active = new Set<string>();
  const currentPath = route.path;

  const isRouteMatch = (routePath: string) =>
    currentPath === routePath ||
    (currentPath.startsWith(routePath) &&
     (currentPath[routePath.length] === '/' || currentPath[routePath.length] === undefined));

  for (const group of visibleGroups.value) {
    if (group.route && isRouteMatch(group.route)) {
      active.add(group.route);
    }

    if (group.items) {
      for (const item of group.items) {
        const itemRoute = item.route || item.path;
        if (itemRoute && isRouteMatch(itemRoute)) {
          active.add(itemRoute);
        }

        if (item.children) {
          for (const child of item.children) {
            const childRoute = child.route || child.path;
            if (childRoute && isRouteMatch(childRoute)) {
              active.add(childRoute);
            }
          }
        }
      }
    }
  }

  return active;
});

const activeGroups = computed(() => {
  const active = new Set<string>();

  for (const group of visibleGroups.value) {
    if (group.route && activeRoutes.value.has(group.route)) {
      active.add(group.id);
      continue;
    }

    if (group.items) {
      const hasActiveItem = group.items.some((item: any) => {
        const itemRoute = item.route || item.path;
        if (itemRoute && activeRoutes.value.has(itemRoute)) return true;

        return item.children?.some((child: any) => {
          const childRoute = child.route || child.path;
          return childRoute && activeRoutes.value.has(childRoute);
        });
      });

      if (hasActiveItem) {
        active.add(group.id);
      }
    }
  }

  return active;
});

const expandedGroups = ref<Set<string>>(new Set());
const searchQuery = ref('');

onMounted(() => {
  const collapsedState = localStorage.getItem('sidebar-collapsed');
  if (collapsedState) {
    setSidebarCollapsed(collapsedState === 'true');
  } else if (!isMobile.value && !isTablet.value) {
    setSidebarCollapsed(true);
  }

  const saved = localStorage.getItem('sidebar-expanded-groups');
  if (saved) {
    try {
      expandedGroups.value = new Set(JSON.parse(saved));
    } catch (e) {}
  } else {
    menuGroups.value.forEach(group => expandedGroups.value.add(group.id));
  }

});

watch(sidebarCollapsed, (newVal) => {
  localStorage.setItem('sidebar-collapsed', String(newVal));
});

watch(expandedGroups, (newVal) => {
  localStorage.setItem('sidebar-expanded-groups', JSON.stringify([...newVal]));
}, { deep: true });

watch(searchQuery, (newQuery) => {
  if (newQuery.trim()) {
    visibleGroups.value.forEach(group => {
      if (group.items?.length) expandedGroups.value.add(group.id);
    });
  }
});

function toggleGroup(groupId: string) {
  if (expandedGroups.value.has(groupId)) {
    expandedGroups.value.delete(groupId);
  } else {
    expandedGroups.value.add(groupId);
  }
}

const isGroupExpanded = (groupId: string) => expandedGroups.value.has(groupId);
const handleMenuClick = () => {
  if (width.value <= 1024) setSidebarVisible(false);
};

const visibleGroups = computed(() => {
  const query = searchQuery.value.toLowerCase().trim();

  return menuGroups.value
    .filter(group => !group.permission || checkPermissionCondition(group.permission))
    .map(group => {
      const permittedItems = group.items?.filter((item: any) =>
        !item.permission || checkPermissionCondition(item.permission)
      ) || [];

      if (!query || group.label.toLowerCase().includes(query)) {
        return { ...group, items: permittedItems };
      }

      const matchedItems = permittedItems.filter((item: any) =>
        item.label.toLowerCase().includes(query) ||
        item.children?.some((child: any) => child.label.toLowerCase().includes(query))
      );

      return { ...group, items: matchedItems };
    })
    .filter(group => !query || group.items?.length);
});
</script>

<template>
  <nav class="flex flex-col h-full relative bg-white dark:bg-gray-900">

    <div class="h-16 flex items-center justify-between px-5 py-8 border-b border-gray-200 dark:border-gray-800 relative">
      <div v-if="!isCollapsed" class="flex items-center gap-3">
        <div class="relative">
          <div class="relative w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden">
            <img v-if="faviconUrl" :src="faviconUrl" alt="Favicon" class="w-full h-full object-cover" />
            <UIcon v-else name="lucide:database" class="w-5 h-5 text-brand-500" />
          </div>
        </div>
        <div>
          <span class="font-semibold text-gray-900 dark:text-white/90 text-base">{{ settings?.projectName || 'Enfyra' }}</span>
          <p class="text-xs text-gray-500 dark:text-gray-400">{{ settings?.projectDescription || 'CMS' }}</p>
        </div>
      </div>
      <div v-else class="flex items-center justify-center w-full">
        <div class="relative w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden">
          <img v-if="faviconUrl" :src="faviconUrl" alt="Favicon" class="w-full h-full object-cover" />
          <UIcon v-else name="lucide:database" class="w-4 h-4 text-brand-500" />
        </div>
      </div>

      <button
        v-if="!isMobile && !isTablet"
        @click="setSidebarCollapsed(!isCollapsed)"
        class="h-9 w-9 p-0 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors duration-150 text-gray-500 dark:text-gray-400"
        :class="isCollapsed ? 'mx-auto' : ''"
      >
        <UIcon
          name="lucide:menu"
          class="w-4 h-4 transition-transform duration-300 ease-out"
          :style="{
            transform: isCollapsed ? 'rotate(90deg)' : 'rotate(0deg)'
          }"
        />
      </button>
    </div>

    <div v-if="!isCollapsed" class="px-3 pt-4 pb-2">
      <div class="relative">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search menu..."
          class="h-10 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent px-4 py-2.5 pl-10 text-sm text-gray-800 dark:text-white/90 shadow-theme-xs placeholder:text-gray-400 dark:placeholder:text-white/30 focus:border-brand-300 dark:focus:border-brand-800 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:bg-gray-900"
        />
        <UIcon name="lucide:search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-400" />
      </div>
    </div>

    <div class="flex-1 overflow-y-auto py-3 custom-scrollbar">
      <div
        v-if="visibleGroups.filter(g => g.position !== 'bottom').length === 0"
        class="flex flex-col items-center justify-center py-12 px-4 text-center"
      >
        <UIcon name="lucide:search-x" class="w-12 h-12 text-gray-400 dark:text-gray-500 mb-3" />
        <p class="text-sm text-gray-500 dark:text-gray-400">
          {{ searchQuery ? 'No menu items found' : 'No menu items available' }}
        </p>
        <p v-if="searchQuery" class="text-xs text-gray-400 dark:text-gray-500 mt-1">
          Try a different search term
        </p>
      </div>

      <template v-if="isCollapsed">
        <div class="space-y-3 px-3 relative">
          <template
            v-for="group in visibleGroups.filter(g => g.position !== 'bottom')"
            :key="group.id"
          >
            <div class="space-y-1" :class="{
              'bg-gray-800/60 rounded-xl': group.type === 'Dropdown Menu'
            }">
              <div class="relative flex items-center">
                <NuxtLink
                  v-if="group.type === 'Menu' && group.route"
                  :to="group.route"
                  @click="handleMenuClick"
                  :class="[
                    'flex-1 aspect-square flex items-center justify-center rounded-lg transition-colors duration-150 p-2',
                    ((group.route && activeRoutes.has(group.route)) || activeGroups.has(group.id)) ? 'text-brand-500 bg-brand-50 dark:bg-brand-500/15 dark:text-brand-400' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
                  ]"
                >
                  <UIcon
                    :name="group.icon"
                    class="w-5 h-5 flex-shrink-0"
                  />
                </NuxtLink>
                <button
                  v-else-if="group.type === 'Dropdown Menu'"
                  @click="toggleGroup(group.id)"
                  :class="[
                    'flex-1 aspect-square flex items-center justify-center rounded-lg transition-colors duration-150 p-2',
                    'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
                  ]"
                >
                  <UIcon
                    :name="group.icon"
                    class="w-5 h-5 flex-shrink-0"
                  />
                </button>

                <!-- Chevron button for dropdowns -->
                <button
                  v-if="group.type === 'Dropdown Menu'"
                  @click.stop="toggleGroup(group.id)"
                  class="w-6 h-6 aspect-square flex items-center justify-center rounded-lg transition-colors duration-150 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5"
                >
                  <UIcon
                    name="lucide:chevron-right"
                    :class="[
                      'w-4 h-4 transition-transform duration-300 ease-out',
                      isGroupExpanded(group.id) ? 'rotate-90' : ''
                    ]"
                  />
                </button>

                <!-- Invisible spacer for standalone menu to match dropdown width -->
                <div v-else class="w-6 h-6"></div>
              </div>

              <!-- Expanded dropdown items (icon-only) -->
              <div
                v-if="group.type === 'Dropdown Menu'"
                :class="[
                  'grid transition-all duration-300 ease-out',
                  isGroupExpanded(group.id) ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                ]"
              >
                <div class="overflow-hidden">
                  <div
                    v-if="group.items"
                    class="space-y-1 pl-1.5"
                  >
              <template v-for="item in group.items" :key="item.id">
                <PermissionGate :condition="item.permission as any">
                  <NuxtLink
                    v-if="item.path || item.route"
                    :to="item.path || item.route"
                    @click="handleMenuClick"
                    :class="[
                      'w-8 h-8 flex items-center justify-center rounded-lg transition-colors duration-150',
                      ((item.path && activeRoutes.has(item.path)) || (item.route && activeRoutes.has(item.route))) ? 'text-brand-500 bg-brand-50 dark:bg-brand-500/15 dark:text-brand-400' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
                    ]"
                  >
                    <UIcon
                      :name="item.icon || 'lucide:circle'"
                      class="w-8 h-8 flex-shrink-0"
                    />
                  </NuxtLink>
                </PermissionGate>
              </template>
                </div>
              </div>
            </div>
            </div>
          </template>
        </div>
      </template>

      <template v-else>
        <div class="space-y-6 relative">
          <template
            v-for="group in visibleGroups.filter(g => g.position !== 'bottom')"
            :key="group.id"
          >
            <div
              v-if="group.type === 'Menu' && (!group.items || group.items.length === 0)"
              class="space-y-1 px-3"
            >
              <NuxtLink
                v-if="group.route"
                :to="group.route"
                @click="handleMenuClick"
                :class="[
                  'menu-item group',
                  (group.route && activeRoutes.has(group.route)) ? 'menu-item-active' : 'menu-item-inactive'
                ]"
              >
                <span :class="(group.route && activeRoutes.has(group.route)) ? 'menu-item-icon-active' : 'menu-item-icon-inactive'">
                  <UIcon
                    :name="group.icon"
                    class="w-5 h-5 flex-shrink-0"
                  />
                </span>
                <span class="menu-item-text">{{ group.label }}</span>
              </NuxtLink>
            </div>

            <div v-else>
        <button
          @click="toggleGroup(group.id)"
          class="w-full flex items-center justify-between px-6 py-2 text-xs uppercase tracking-wider transition-colors group cursor-pointer text-gray-400 dark:text-gray-500"
        >
          <span>{{ group.label }}</span>
          <UIcon
            :name="'lucide:chevron-right'"
            :class="[
              'w-4 h-4 transition-transform duration-300 ease-out',
              isGroupExpanded(group.id) ? 'rotate-90 text-brand-500 dark:text-brand-400' : 'text-gray-500 dark:text-gray-400'
            ]"
          />
        </button>

        <div
          :class="[
            'grid transition-all duration-300 ease-out',
            isGroupExpanded(group.id) && group.items && group.items.length > 0 ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
          ]"
        >
          <div class="overflow-hidden">
            <div
              v-if="group.items && group.items.length > 0"
              class="space-y-1.5 px-3 mt-2"
            >
          <template v-for="item in group.items" :key="item.id">
            <PermissionGate :condition="item.permission as any">
              <div
                v-if="item.children && item.children.length > 0"
                class="space-y-1"
              >
                <div class="px-2 py-1.5 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                  {{ item.label }}
                </div>

                <PermissionGate
                  v-for="child in item.children"
                  :key="child.id"
                  :condition="child.permission as any"
                >
                  <NuxtLink
                    v-if="child.path || child.route"
                    :to="child.path || child.route"
                    @click="handleMenuClick"
                    :class="[
                      'menu-dropdown-item group',
                      ((child.path && activeRoutes.has(child.path)) || (child.route && activeRoutes.has(child.route))) ? 'menu-dropdown-item-active' : 'menu-dropdown-item-inactive'
                    ]"
                  >
                    <span :class="((child.path && activeRoutes.has(child.path)) || (child.route && activeRoutes.has(child.route))) ? 'menu-item-icon-active' : 'menu-item-icon-inactive'">
                      <UIcon
                        :name="child.icon || 'lucide:circle'"
                        class="w-5 h-5 flex-shrink-0"
                      />
                    </span>
                    <span>{{ child.label }}</span>
                  </NuxtLink>
                </PermissionGate>
              </div>

              <NuxtLink
                v-else-if="item.path || item.route"
                :to="item.path || item.route"
                @click="handleMenuClick"
                :class="[
                  'menu-item group',
                  ((item.path && activeRoutes.has(item.path)) || (item.route && activeRoutes.has(item.route))) ? 'menu-item-active' : 'menu-item-inactive'
                ]"
              >
                <span :class="((item.path && activeRoutes.has(item.path)) || (item.route && activeRoutes.has(item.route))) ? 'menu-item-icon-active' : 'menu-item-icon-inactive'">
                  <UIcon
                    :name="item.icon || 'lucide:circle'"
                    class="w-5 h-5 flex-shrink-0"
                  />
                </span>
                <span class="menu-item-text">{{ item.label }}</span>
              </NuxtLink>
            </PermissionGate>
          </template>
            </div>
          </div>
        </div>
            </div>
          </template>
        </div>
      </template>
    </div>

    <div v-if="visibleGroups.some(g => g.position === 'bottom')" class="p-4 border-t border-gray-200 dark:border-gray-800 relative">
      <template v-for="group in visibleGroups.filter(g => g.position === 'bottom')" :key="group.id">
        <PermissionGate :condition="group.permission as any">
          <UButton
            @click="group.onClick"
            :icon="group.icon"
            :label="isCollapsed ? undefined : group.label"
            variant="ghost"
            color="error"
            :class="[
              'w-full justify-start',
              isCollapsed ? 'justify-center' : '',
              group.class ? group.class : ''
            ]"
          />
        </PermissionGate>
      </template>
    </div>
  </nav>
</template>
