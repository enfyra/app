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

// Memoize active routes to prevent flicker on route change
const activeRoutes = computed(() => {
  const active = new Set<string>();
  const currentPath = route.path;

  // Check all menu groups and their items
  visibleGroups.value.forEach(group => {
    // Check main group route
    if (group.route) {
      if (currentPath === group.route ||
          (currentPath.startsWith(group.route) &&
           (currentPath[group.route.length] === '/' || currentPath[group.route.length] === undefined))) {
        active.add(group.route);
      }
    }

    // Check group items
    group.items?.forEach((item: any) => {
      const itemRoute = item.route || item.path;
      if (itemRoute) {
        if (currentPath === itemRoute ||
            (currentPath.startsWith(itemRoute) &&
             (currentPath[itemRoute.length] === '/' || currentPath[itemRoute.length] === undefined))) {
          active.add(itemRoute);
        }
      }

      // Check nested children
      item.children?.forEach((child: any) => {
        const childRoute = child.route || child.path;
        if (childRoute) {
          if (currentPath === childRoute ||
              (currentPath.startsWith(childRoute) &&
               (currentPath[childRoute.length] === '/' || currentPath[childRoute.length] === undefined))) {
            active.add(childRoute);
          }
        }
      });
    });
  });

  return active;
});

// Memoize active groups to prevent flicker
const activeGroups = computed(() => {
  const active = new Set<string>();

  visibleGroups.value.forEach(group => {
    // Check if group route is active
    if (group.route && activeRoutes.value.has(group.route)) {
      active.add(group.id);
    }

    // Check if any item in group is active
    if (group.items && group.items.length > 0) {
      const hasActiveItem = group.items.some((item: any) => {
        const itemRoute = item.route || item.path;
        if (itemRoute && activeRoutes.value.has(itemRoute)) return true;

        // Check children
        if (item.children && item.children.length > 0) {
          return item.children.some((child: any) => {
            const childRoute = child.route || child.path;
            return childRoute && activeRoutes.value.has(childRoute);
          });
        }
        return false;
      });

      if (hasActiveItem) {
        active.add(group.id);
      }
    }
  });

  return active;
});

// Track expanded groups - shared state for both desktop and collapsed views (use localStorage to persist)
const expandedGroups = ref<Set<string>>(new Set());

// Load states from localStorage on mount
onMounted(() => {
  // Load collapse state
  const collapsedState = localStorage.getItem('sidebar-collapsed');
  if (collapsedState) {
    setSidebarCollapsed(collapsedState === 'true');
  } else {
    // Default: auto collapse on lg (desktop) breakpoint
    if (!isMobile.value && !isTablet.value) {
      setSidebarCollapsed(true);
    }
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

function toggleGroup(groupId: string) {
  if (expandedGroups.value.has(groupId)) {
    expandedGroups.value.delete(groupId);
  } else {
    expandedGroups.value.add(groupId);
  }
}

// Check if group is expanded - shared for both desktop and collapsed views
function isGroupExpanded(groupId: string) {
  return expandedGroups.value.has(groupId);
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

    <div class="flex-1 overflow-y-auto py-3">
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
            class="space-y-1"
          >
            <div class="relative flex items-center gap-1 px-3">
              <button
                @click="() => {
                  // Only navigate if it's a standalone menu (type = Menu)
                  if (group.type === 'Menu' && group.route) {
                    navigateTo(group.route);
                    handleMenuClick();
                  } else if (group.type === 'Dropdown Menu') {
                    toggleGroup(group.id);
                  }
                }"
                :class="[
                  'flex-1 aspect-square flex items-center justify-center rounded-xl transition-all duration-300 relative group',
                  group.type === 'Menu' && ((group.route && activeRoutes.has(group.route)) || activeGroups.has(group.id)) ? 'text-white' : 'hover:bg-[var(--bg-elevated)]'
                ]"
                :style="{ color: group.type === 'Menu' && ((group.route && activeRoutes.has(group.route)) || activeGroups.has(group.id)) ? 'white' : 'var(--text-secondary)' }"
              >
                <div
                  v-if="group.type === 'Menu' && ((group.route && activeRoutes.has(group.route)) || activeGroups.has(group.id))"
                  class="absolute inset-0 rounded-xl bg-gradient-to-r from-[#0066FF] to-[#7C3AED] transition-all duration-300"
                ></div>

                <div
                  v-if="group.type === 'Menu' && ((group.route && activeRoutes.has(group.route)) || activeGroups.has(group.id))"
                  class="absolute inset-0 rounded-xl bg-gradient-to-r from-[#0066FF] to-[#7C3AED] blur-xl opacity-30 transition-opacity duration-300"
                ></div>

                <UIcon
                  :name="group.icon"
                  class="w-5 h-5 flex-shrink-0 relative z-10 group-hover:scale-110 transition-transform duration-300"
                />
              </button>

              <!-- Chevron button for dropdowns -->
              <button
                v-if="group.type === 'Dropdown Menu'"
                @click.stop="toggleGroup(group.id)"
                :class="[
                  'w-6 h-6 aspect-square flex items-center justify-center rounded-lg transition-all duration-300',
                  'hover:bg-[var(--bg-elevated)] text-[var(--text-tertiary)]'
                ]"
              >
                <UIcon
                  name="lucide:chevron-right"
                  :class="[
                    'w-4 h-4 transition-transform duration-300',
                    isGroupExpanded(group.id) ? 'rotate-90' : ''
                  ]"
                />
              </button>
            </div>

            <!-- Expanded dropdown items (icon-only) -->
            <div
              v-if="isGroupExpanded(group.id) && group.items"
              class="space-y-1 px-3 overflow-hidden"
            >
              <template v-for="item in group.items" :key="item.id">
                <PermissionGate :condition="item.permission as any">
                  <!-- Dropdown with children -->
                  <template v-if="item.children && item.children.length > 0">
                    <PermissionGate
                      v-for="child in item.children"
                      :key="child.id"
                      :condition="child.permission as any"
                    >
                      <button
                        @click="() => { navigateTo(child.path || child.route); handleMenuClick(); }"
                        :class="[
                          'w-full aspect-square flex items-center justify-center rounded-lg transition-all duration-300 relative group',
                          ((child.path && activeRoutes.has(child.path)) || (child.route && activeRoutes.has(child.route))) ? 'text-white bg-gradient-to-r from-[#7C3AED]/20 to-[#D946EF]/20' : 'hover:bg-[var(--bg-elevated)]'
                        ]"
                        :style="{ color: ((child.path && activeRoutes.has(child.path)) || (child.route && activeRoutes.has(child.route))) ? 'white' : 'var(--text-tertiary)' }"
                      >
                        <UIcon
                          :name="child.icon || 'lucide:circle'"
                          class="w-4 h-4 flex-shrink-0 relative z-10"
                        />
                      </button>
                    </PermissionGate>
                  </template>

                  <!-- Regular item -->
                  <button
                    v-else
                    @click="() => { navigateTo(item.path || item.route); handleMenuClick(); }"
                    :class="[
                      'w-full aspect-square flex items-center justify-center rounded-lg transition-all duration-300 relative group',
                      ((item.path && activeRoutes.has(item.path)) || (item.route && activeRoutes.has(item.route))) ? 'text-white bg-gradient-to-r from-[#7C3AED]/20 to-[#D946EF]/20' : 'hover:bg-[var(--bg-elevated)]'
                    ]"
                    :style="{ color: ((item.path && activeRoutes.has(item.path)) || (item.route && activeRoutes.has(item.route))) ? 'white' : 'var(--text-tertiary)' }"
                  >
                    <UIcon
                      :name="item.icon || 'lucide:circle'"
                      class="w-4 h-4 flex-shrink-0 relative z-10"
                    />
                  </button>
                </PermissionGate>
              </template>
            </div>
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
                  (group.route && activeRoutes.has(group.route)) ? 'text-white' : 'hover:bg-[var(--bg-elevated)]'
                ]"
                :style="{ color: (group.route && activeRoutes.has(group.route)) ? 'white' : 'var(--text-secondary)' }"
              >
                <div
                  v-if="group.route && activeRoutes.has(group.route)"
                  class="absolute inset-0 rounded-xl bg-gradient-to-r from-[#0066FF] to-[#7C3AED] transition-all duration-300"
                ></div>

                <div
                  v-if="group.route && activeRoutes.has(group.route)"
                  class="absolute inset-0 rounded-xl bg-gradient-to-r from-[#0066FF] to-[#7C3AED] blur-xl opacity-30 transition-all duration-300"
                ></div>

                <UIcon
                  :name="group.icon"
                  class="w-5 h-5 flex-shrink-0 relative z-10 group-hover:scale-110 transition-transform duration-300"
                />

                <span class="text-sm relative z-10 font-medium">{{ group.label }}</span>

                <div
                  v-if="group.route && activeRoutes.has(group.route)"
                  class="ml-auto w-1.5 h-1.5 rounded-full bg-white relative z-10"
                ></div>
              </button>
            </div>

            <div v-else>
        <button
          @click="toggleGroup(group.id)"
          :class="[
            'w-full flex items-center justify-between px-6 py-2 text-xs uppercase tracking-wider transition-colors group cursor-pointer'
          ]"
          :style="{
            color: 'var(--text-quaternary)'
          }"
        >
          <span class="group-hover:text-gradient-primary transition-all">{{ group.label }}</span>
          <UIcon
            :name="'lucide:chevron-right'"
            class="w-4 h-4 transition-transform duration-300"
            :style="{ transform: isGroupExpanded(group.id) ? 'rotate(90deg)' : 'rotate(0deg)' }"
          />
        </button>

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
                      ((child.path && activeRoutes.has(child.path)) || (child.route && activeRoutes.has(child.route))) ? 'text-white' : 'hover:bg-[var(--bg-elevated)]'
                    ]"
                    :style="{ color: ((child.path && activeRoutes.has(child.path)) || (child.route && activeRoutes.has(child.route))) ? 'white' : 'var(--text-tertiary)' }"
                  >
                    <div
                      v-if="(child.path && activeRoutes.has(child.path)) || (child.route && activeRoutes.has(child.route))"
                      class="absolute inset-0 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#D946EF] transition-all duration-300"
                    ></div>

                    <div
                      v-if="(child.path && activeRoutes.has(child.path)) || (child.route && activeRoutes.has(child.route))"
                      class="absolute inset-0 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#D946EF] blur-xl opacity-30 transition-all duration-300"
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
                  ((item.path && activeRoutes.has(item.path)) || (item.route && activeRoutes.has(item.route))) ? 'text-white' : 'hover:bg-[var(--bg-elevated)]'
                ]"
                :style="{ color: ((item.path && activeRoutes.has(item.path)) || (item.route && activeRoutes.has(item.route))) ? 'white' : 'var(--text-tertiary)' }"
              >
                <div
                  v-if="(item.path && activeRoutes.has(item.path)) || (item.route && activeRoutes.has(item.route))"
                  class="absolute inset-0 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#D946EF] transition-all duration-300"
                ></div>

                <div
                  v-if="(item.path && activeRoutes.has(item.path)) || (item.route && activeRoutes.has(item.route))"
                  class="absolute inset-0 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#D946EF] blur-xl opacity-30 transition-all duration-300"
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
              'w-full flex items-center gap-3 p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 transition-all duration-300 cursor-pointer group hover:scale-[1.02]',
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
