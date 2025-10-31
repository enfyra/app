<script setup lang="ts">
const route = useRoute();
const { menuGroups } = useMenuRegistry();
const { checkPermissionCondition } = usePermissions();
const { isMobile, isTablet } = useScreen();
const { setSidebarVisible, sidebarCollapsed, setSidebarCollapsed } = useGlobalState();

// Use global collapsed state (but force false on mobile/tablet)
const isCollapsed = computed(() => {
  if (isMobile.value || isTablet.value) return false;
  return sidebarCollapsed.value;
});

// Track expanded groups (use localStorage to persist)
const expandedGroups = ref<Set<string>>(new Set());

// Load states from localStorage on mount
onMounted(() => {
  // Load collapse state
  const collapsedState = localStorage.getItem('sidebar-collapsed');
  if (collapsedState) {
    setSidebarCollapsed(collapsedState === 'true');
  }

  // Load expanded groups
  const saved = localStorage.getItem('sidebar-expanded-groups');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      expandedGroups.value = new Set(parsed);
    } catch (e) {
      // Ignore parse errors
    }
  } else {
    // Default: expand all groups on first load
    menuGroups.value.forEach(group => {
      expandedGroups.value.add(group.id);
    });
  }
});

// Save collapse state to localStorage
watch(sidebarCollapsed, (newVal) => {
  localStorage.setItem('sidebar-collapsed', String(newVal));
});

// Save to localStorage whenever it changes
watch(expandedGroups, (newVal) => {
  localStorage.setItem('sidebar-expanded-groups', JSON.stringify([...newVal]));
}, { deep: true });

// Toggle group expansion
function toggleGroup(groupId: string) {
  if (expandedGroups.value.has(groupId)) {
    expandedGroups.value.delete(groupId);
  } else {
    expandedGroups.value.add(groupId);
  }
}

// Check if group is expanded
function isGroupExpanded(groupId: string) {
  return expandedGroups.value.has(groupId);
}

// Check if item or any of its children is active
function isItemActive(itemRoute: string | undefined) {
  if (!itemRoute) return false;

  const currentPath = route.path;

  // Exact match
  if (currentPath === itemRoute) return true;

  // For routes that should match sub-paths
  if (currentPath.startsWith(itemRoute)) {
    const nextChar = currentPath[itemRoute.length];
    return nextChar === '/' || nextChar === undefined;
  }

  return false;
}

// Check if any child in the group is active (to highlight parent)
function isGroupActive(group: any) {
  if (group.route && isItemActive(group.route)) return true;

  if (group.items && group.items.length > 0) {
    return group.items.some((item: any) => {
      if (isItemActive(item.route)) return true;
      if (item.children && item.children.length > 0) {
        return item.children.some((child: any) => isItemActive(child.route || child.path));
      }
      return false;
    });
  }

  return false;
}

// Handle menu click - close sidebar on mobile/tablet
function handleMenuClick() {
  if (isMobile.value || isTablet.value) {
    setSidebarVisible(false);
  }
}

// Search functionality
const searchQuery = ref('');

// Auto-expand groups when searching
watch(searchQuery, (newQuery) => {
  if (newQuery.trim()) {
    // Expand all groups when searching
    visibleGroups.value.forEach(group => {
      if (group.items && group.items.length > 0) {
        expandedGroups.value.add(group.id);
      }
    });
  }
});

// Filter groups by permission and search
const visibleGroups = computed(() => {
  const query = searchQuery.value.toLowerCase().trim();

  return menuGroups.value
    .filter(group => {
      // Check group permission
      if (group.permission && !checkPermissionCondition(group.permission)) {
        return false;
      }
      return true;
    })
    .map(group => {
      // Filter items by permission first
      const permittedItems = group.items?.filter((item: any) => {
        if (!item.permission) return true;
        return checkPermissionCondition(item.permission);
      }) || [];

      // If no search query, return group with all permitted items
      if (!query) {
        return {
          ...group,
          items: permittedItems
        };
      }

      // Search in group label - if match, show all permitted items
      if (group.label.toLowerCase().includes(query)) {
        return {
          ...group,
          items: permittedItems
        };
      }

      // Filter items by search query
      const matchedItems = permittedItems.filter((item: any) => {
        // Search in item label
        if (item.label.toLowerCase().includes(query)) return true;

        // Search in children
        if (item.children && item.children.length > 0) {
          return item.children.some((child: any) =>
            child.label.toLowerCase().includes(query)
          );
        }

        return false;
      });

      return {
        ...group,
        items: matchedItems
      };
    })
    .filter(group => {
      // Remove groups with no items
      if (!query) return true;
      return group.items && group.items.length > 0;
    });
});
</script>

<template>
  <nav class="flex flex-col h-full relative">
    <div class="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#0066FF] via-[#7C3AED] to-[#D946EF] opacity-50 z-10"></div>

    <div class="h-16 flex items-center justify-between px-6 border-b relative" style="border-color: var(--border-subtle)">
      <transition
        enter-active-class="transition-all duration-300"
        enter-from-class="opacity-0 -translate-x-4"
        enter-to-class="opacity-100 translate-x-0"
        leave-active-class="transition-all duration-300"
        leave-from-class="opacity-100 translate-x-0"
        leave-to-class="opacity-0 -translate-x-4"
      >
        <div v-if="!isCollapsed" class="flex items-center gap-3">
          <div class="relative">
            <div class="absolute inset-0 bg-gradient-to-br from-[#0066FF] to-[#7C3AED] rounded-xl blur-md opacity-60"></div>
            <div class="relative w-10 h-10 rounded-xl bg-gradient-to-br from-[#0066FF] to-[#7C3AED] flex items-center justify-center">
              <UIcon name="lucide:database" class="w-5 h-5 text-white" />
            </div>
          </div>
          <div>
            <span class="font-bold text-gradient-primary text-lg tracking-tight">Enfyra</span>
            <p class="text-xs" style="color: var(--text-quaternary)">CMS</p>
          </div>
        </div>
      </transition>

      <button
        v-if="!isMobile && !isTablet"
        @click="setSidebarCollapsed(!isCollapsed)"
        class="h-9 w-9 p-0 flex items-center justify-center rounded-xl hover:bg-[var(--bg-elevated)] transition-all duration-300 hover:scale-110"
        :class="isCollapsed ? 'mx-auto' : ''"
      >
        <UIcon
          name="lucide:menu"
          class="w-4 h-4 transition-transform duration-300"
          :style="{
            color: 'var(--text-tertiary)',
            transform: isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)'
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

    <div class="flex-1 overflow-y-auto scrollbar-custom py-3">
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
        <div class="space-y-1 px-3">
          <div
            v-for="group in visibleGroups.filter(g => g.position !== 'bottom')"
            :key="group.id"
          >
            <button
              @click="() => {
                // Only navigate if it's a standalone menu (type = Menu)
                if (group.type === 'Menu' && group.route) {
                  navigateTo(group.route);
                  handleMenuClick();
                } else if (group.type === 'Dropdown Menu' && group.items && group.items.length > 0 && group.items[0]) {
                  // If it's a dropdown group with children, go to first child
                  const firstChild = group.items[0];
                  navigateTo(firstChild.route || firstChild.path);
                  handleMenuClick();
                }
              }"
              :class="[
                'w-full flex items-center justify-center px-3 py-2.5 rounded-xl transition-all duration-300 relative group',
                isItemActive(group.route) || isGroupActive(group) ? 'text-white' : 'hover:bg-[var(--bg-elevated)]'
              ]"
              :style="{ color: (isItemActive(group.route) || isGroupActive(group)) ? 'white' : 'var(--text-secondary)' }"
            >
              <div
                v-if="isItemActive(group.route) || isGroupActive(group)"
                class="absolute inset-0 rounded-xl bg-gradient-to-r from-[#0066FF] to-[#7C3AED] transition-all duration-300"
              ></div>

              <div
                v-if="isItemActive(group.route) || isGroupActive(group)"
                class="absolute inset-0 rounded-xl bg-gradient-to-r from-[#0066FF] to-[#7C3AED] blur-xl opacity-30 transition-opacity duration-300"
              ></div>

              <UIcon
                :name="group.icon"
                class="w-5 h-5 flex-shrink-0 relative z-10 group-hover:scale-110 transition-transform duration-300"
              />
            </button>
          </div>
        </div>
      </template>

      <template v-else>
        <div class="space-y-6">
          <template
            v-for="group in visibleGroups.filter(g => g.position !== 'bottom')"
            :key="group.id"
          >
            <div
              v-if="group.type === 'Menu' && (!group.items || group.items.length === 0)"
              class="space-y-1 px-3"
            >
              <button
                @click="() => { if (group.route) navigateTo(group.route); handleMenuClick(); }"
                :class="[
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 relative group',
                  isItemActive(group.route) ? 'text-white' : 'hover:bg-[var(--bg-elevated)]'
                ]"
                :style="{ color: isItemActive(group.route) ? 'white' : 'var(--text-secondary)' }"
              >
                <div
                  v-if="isItemActive(group.route)"
                  class="absolute inset-0 rounded-xl bg-gradient-to-r from-[#0066FF] to-[#7C3AED] transition-all duration-300"
                ></div>

                <div
                  v-if="isItemActive(group.route)"
                  class="absolute inset-0 rounded-xl bg-gradient-to-r from-[#0066FF] to-[#7C3AED] blur-xl opacity-30 transition-opacity duration-300"
                ></div>

                <UIcon
                  :name="group.icon"
                  class="w-5 h-5 flex-shrink-0 relative z-10 group-hover:scale-110 transition-transform duration-300"
                />

                <span class="text-sm relative z-10 font-medium">{{ group.label }}</span>

                <div
                  v-if="isItemActive(group.route)"
                  class="ml-auto w-1.5 h-1.5 rounded-full bg-white relative z-10"
                ></div>
              </button>
            </div>

            <div v-else>
        <button
          @click="group.items && group.items.length > 0 ? toggleGroup(group.id) : null"
          :class="[
            'w-full flex items-center justify-between px-6 py-2 text-xs uppercase tracking-wider transition-colors group cursor-pointer',
            isGroupActive(group) ? 'text-gradient-primary' : ''
          ]"
          :style="{
            color: isGroupActive(group) ? 'var(--color-primary-500)' : 'var(--text-quaternary)',
            opacity: (!group.items || group.items.length === 0) ? 0.5 : 1
          }"
        >
          <span class="group-hover:text-gradient-primary transition-all">{{ group.label }}</span>
          <UIcon
            :name="'lucide:chevron-right'"
            class="w-4 h-4 transition-transform duration-300"
            :style="{ transform: isGroupExpanded(group.id) ? 'rotate(90deg)' : 'rotate(0deg)' }"
          />
        </button>

        <transition
          enter-active-class="transition-all duration-300 ease-out"
          enter-from-class="opacity-0 max-h-0"
          enter-to-class="opacity-100 max-h-screen"
          leave-active-class="transition-all duration-300 ease-in"
          leave-from-class="opacity-100 max-h-screen"
          leave-to-class="opacity-0 max-h-0"
        >
          <div
            v-if="isGroupExpanded(group.id) && group.items && group.items.length > 0"
            class="space-y-1 px-3 mt-2 overflow-hidden"
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
                    <button
                      @click="() => { navigateTo(child.path || child.route); handleMenuClick(); }"
                      :class="[
                        'w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-300 relative group',
                        isItemActive(child.path || child.route) ? 'text-white' : 'hover:bg-[var(--bg-elevated)]'
                      ]"
                      :style="{ color: isItemActive(child.path || child.route) ? 'white' : 'var(--text-tertiary)' }"
                    >
                      <div
                        v-if="isItemActive(child.path || child.route)"
                        class="absolute inset-0 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#D946EF] transition-all duration-300"
                      ></div>

                      <div
                        v-if="isItemActive(child.path || child.route)"
                        class="absolute inset-0 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#D946EF] blur-xl opacity-30 transition-opacity duration-300"
                      ></div>

                      <UIcon
                        :name="child.icon || 'lucide:circle'"
                        class="w-5 h-5 flex-shrink-0 relative z-10 group-hover:scale-110 transition-transform duration-300"
                      />
                      <span class="text-sm relative z-10">{{ child.label }}</span>
                    </button>
                  </PermissionGate>
                </div>

                <button
                  v-else
                  @click="() => { navigateTo(item.path || item.route); handleMenuClick(); }"
                  :class="[
                    'w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-300 relative group',
                    isItemActive(item.path || item.route) ? 'text-white' : 'hover:bg-[var(--bg-elevated)]'
                  ]"
                  :style="{ color: isItemActive(item.path || item.route) ? 'white' : 'var(--text-tertiary)' }"
                >
                  <div
                    v-if="isItemActive(item.path || item.route)"
                    class="absolute inset-0 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#D946EF] transition-all duration-300"
                  ></div>

                  <div
                    v-if="isItemActive(item.path || item.route)"
                    class="absolute inset-0 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#D946EF] blur-xl opacity-30 transition-opacity duration-300"
                  ></div>

                  <UIcon
                    :name="item.icon || 'lucide:circle'"
                    class="w-5 h-5 flex-shrink-0 relative z-10 group-hover:scale-110 transition-transform duration-300"
                  />
                  <span class="text-sm relative z-10">{{ item.label }}</span>
                </button>
              </PermissionGate>
            </template>
          </div>
        </transition>
            </div>
          </template>
        </div>
      </template>
    </div>

    <div v-if="visibleGroups.some(g => g.position === 'bottom')" class="p-4 border-t relative" style="border-color: var(--border-subtle)">
      <div class="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#7C3AED] to-transparent opacity-50"></div>

      <template v-for="group in visibleGroups.filter(g => g.position === 'bottom')" :key="group.id">
        <PermissionGate :condition="group.permission as any">
          <button
            @click="group.onClick"
            :class="[
              'w-full flex items-center gap-3 p-2 rounded-xl hover:bg-[var(--bg-elevated)] transition-all duration-300 cursor-pointer group hover:scale-[1.02]',
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

<style scoped>
.scrollbar-custom::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

.scrollbar-custom::-webkit-scrollbar-track {
  background: var(--bg-surface);
  border-radius: 10px;
}

.scrollbar-custom::-webkit-scrollbar-thumb {
  background: var(--bg-elevated-high);
  border-radius: 10px;
  border: 2px solid var(--bg-surface);
}

.scrollbar-custom::-webkit-scrollbar-thumb:hover {
  background: rgba(124, 58, 237, 0.5);
}
</style>
