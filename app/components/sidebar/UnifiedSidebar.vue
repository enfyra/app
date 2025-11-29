<script setup lang="ts">
const route = useRoute();
const { menuGroups } = useMenuRegistry();
const { checkPermissionCondition } = usePermissions();
const { isMobile, isTablet, width } = useScreen();
const { setSidebarVisible, sidebarCollapsed, setSidebarCollapsed, settings } = useGlobalState();
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
  <nav class="flex flex-col h-full relative">

    <div class="h-16 flex items-center justify-between px-6 border-b border-gray-800 relative">
      <div v-if="!isCollapsed" class="flex items-center gap-3">
        <div class="relative">
          <div class="absolute inset-0 bg-gradient-to-br from-[#0066FF] to-[#7C3AED] rounded-xl blur-md opacity-60"></div>
          <div class="relative w-10 h-10 rounded-xl bg-gradient-to-br from-[#0066FF] to-[#7C3AED] flex items-center justify-center overflow-hidden">
            <img v-if="faviconUrl" :src="faviconUrl" alt="Favicon" class="w-full h-full object-cover" />
            <UIcon v-else name="lucide:database" class="w-5 h-5 text-white" />
          </div>
        </div>
        <div>
          <span class="font-bold text-gradient-primary text-lg tracking-tight">{{ settings?.projectName || 'Enfyra' }}</span>
          <p class="text-xs text-gray-500">{{ settings?.projectDescription || 'CMS' }}</p>
        </div>
      </div>

      <button
        v-if="!isMobile && !isTablet"
        @click="setSidebarCollapsed(!isCollapsed)"
        class="h-9 w-9 p-0 flex items-center justify-center rounded-xl hover:bg-gray-800/50 transition-colors duration-150 text-gray-400"
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
      <UInput
        v-model="searchQuery"
        placeholder="Search menu..."
        icon="lucide:search"
        size="sm"
        class="w-full"
      />
    </div>

    <div class="flex-1 overflow-y-auto py-3 scrollbar-hide">
      <div
        v-if="visibleGroups.filter(g => g.position !== 'bottom').length === 0"
        class="flex flex-col items-center justify-center py-12 px-4 text-center"
      >
        <UIcon name="lucide:search-x" class="w-12 h-12 text-muted-foreground mb-3" />
        <p class="text-sm text-muted-foreground">
          {{ searchQuery ? 'No menu items found' : 'No menu items available' }}
        </p>
        <p v-if="searchQuery" class="text-xs text-muted-foreground/70 mt-1">
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
                    'flex-1 aspect-square flex items-center justify-center rounded-xl transition-colors duration-150 p-2',
                    ((group.route && activeRoutes.has(group.route)) || activeGroups.has(group.id)) ? 'text-white bg-gradient-to-r from-[#0066FF] to-[#7C3AED]' : 'text-gray-300 hover:bg-gray-800/50'
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
                    'flex-1 aspect-square flex items-center justify-center rounded-xl transition-colors duration-150 p-2',
                    'text-gray-300 hover:bg-gray-800/50'
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
                  class="w-6 h-6 aspect-square flex items-center justify-center rounded-lg transition-colors duration-150 text-gray-400 hover:bg-gray-800/50"
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
                      'w-8 h-8 flex items-center justify-center rounded-xl transition-colors duration-15',
                      ((item.path && activeRoutes.has(item.path)) || (item.route && activeRoutes.has(item.route))) ? 'text-white bg-gradient-to-r from-[#7C3AED] to-[#D946EF]' : 'text-gray-400 hover:bg-gray-800/50'
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
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors duration-150',
                  (group.route && activeRoutes.has(group.route)) ? 'text-white bg-gradient-to-r from-[#0066FF] to-[#7C3AED]' : 'text-gray-300 hover:bg-gray-800/50'
                ]"
              >
                <UIcon
                  :name="group.icon"
                  class="w-5 h-5 flex-shrink-0"
                />

                <span class="text-sm font-medium">{{ group.label }}</span>
              </NuxtLink>
            </div>

            <div v-else>
        <button
          @click="toggleGroup(group.id)"
          class="w-full flex items-center justify-between px-6 py-2 text-xs uppercase tracking-wider transition-colors group cursor-pointer text-gray-500"
        >
          <span class="group-hover:text-gradient-primary transition-all">{{ group.label }}</span>
          <UIcon
            :name="'lucide:chevron-right'"
            class="w-4 h-4 transition-transform duration-300 ease-out"
            :style="{ transform: isGroupExpanded(group.id) ? 'rotate(90deg)' : 'rotate(0deg)' }"
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
                <div class="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
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
                      'w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-colors duration-150',
                      ((child.path && activeRoutes.has(child.path)) || (child.route && activeRoutes.has(child.route))) ? 'text-white bg-gradient-to-r from-[#7C3AED] to-[#D946EF]' : 'text-gray-400 hover:bg-gray-800/50'
                    ]"
                  >
                    <UIcon
                      :name="child.icon || 'lucide:circle'"
                      class="w-5 h-5 flex-shrink-0"
                    />
                    <span class="text-sm">{{ child.label }}</span>
                  </NuxtLink>
                </PermissionGate>
              </div>

              <NuxtLink
                v-else-if="item.path || item.route"
                :to="item.path || item.route"
                @click="handleMenuClick"
                :class="[
                  'w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-colors duration-150',
                  ((item.path && activeRoutes.has(item.path)) || (item.route && activeRoutes.has(item.route))) ? 'text-white bg-gradient-to-r from-[#7C3AED] to-[#D946EF]' : 'text-gray-400 hover:bg-gray-800/50'
                ]"
              >
                <UIcon
                  :name="item.icon || 'lucide:circle'"
                  class="w-5 h-5 flex-shrink-0"
                />
                <span class="text-sm">{{ item.label }}</span>
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

    <div v-if="visibleGroups.some(g => g.position === 'bottom')" class="p-4 border-t border-gray-800 relative">
      <div class="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#7C3AED] to-transparent opacity-50"></div>

      <template v-for="group in visibleGroups.filter(g => g.position === 'bottom')" :key="group.id">
        <PermissionGate :condition="group.permission as any">
          <button
            @click="group.onClick"
            :class="[
              'w-full flex items-center gap-3 p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 transition-colors duration-150 cursor-pointer group',
              isCollapsed ? 'justify-center' : ''
            ]"
          >
            <div class="w-8 h-8 rounded-lg bg-red-500/15 text-red-600 flex items-center justify-center group-hover:bg-red-500/25 transition-colors">
              <UIcon :name="group.icon" size="18" :class="group.class" />
            </div>
            <span v-if="!isCollapsed" class="text-sm font-medium text-red-600 group-hover:text-red-500 transition-colors">{{ group.label }}</span>
          </button>
        </PermissionGate>
      </template>
    </div>
  </nav>
</template>
