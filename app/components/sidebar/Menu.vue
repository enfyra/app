<script setup lang="ts">
const { setSidebarVisible } = useGlobalState();
const route = useRoute();
const { isMobile, isTablet } = useScreen();
const { getMenuItemsBySidebar, miniSidebars } = useMenuRegistry();

// Expanded state for collapsible menu items
const expandedItems = ref<Set<string>>(new Set());

function handleMenuClick() {
  if (isMobile.value || isTablet.value) {
    setSidebarVisible(false);
  }
}

// Toggle expand/collapse for menu items with children
function toggleExpanded(itemId: string | number) {
  const id = String(itemId);
  if (expandedItems.value.has(id)) {
    expandedItems.value.delete(id);
  } else {
    expandedItems.value.add(id);
  }
}

// Check if menu item is expanded
function isExpanded(itemId: string | number) {
  return expandedItems.value.has(String(itemId));
}

// Check if menu item has children
function hasChildren(item: any) {
  return item.children && item.children.length > 0;
}

// Function to check if item is active
const isItemActive = (itemRoute: string) => {
  const currentPath = route.path;

  // If item route is exactly '/collections', only active when current path is exactly '/collections'
  if (itemRoute === "/collections") {
    return currentPath === "/collections";
  }

  // For exact matches
  if (currentPath === itemRoute) {
    return true;
  }

  // For routes that should match sub-paths, ensure proper boundary matching
  // Only match if the next character after the route is '/' or end of string
  if (currentPath.startsWith(itemRoute)) {
    const nextChar = currentPath[itemRoute.length];
    return nextChar === '/' || nextChar === undefined;
  }

  return false;
};

// Get current sidebar based on registered mini sidebars
const currentSidebar = computed(() => {
  const path = route.path;
  
  // Sort by route length (longest first) to prioritize more specific routes
  const sortedSidebars = [...miniSidebars.value].sort((a, b) => 
    (b.route?.length || 0) - (a.route?.length || 0)
  );
  
  const matchingSidebar = sortedSidebars.find((sidebar) => {
    if (!sidebar.route) return false;
    
    // Exact match
    if (path === sidebar.route) return true;
    
    // Sub-path match with proper boundary
    if (path.startsWith(sidebar.route)) {
      const nextChar = path[sidebar.route.length];
      return nextChar === '/' || nextChar === undefined;
    }
    
    return false;
  });
  
  return matchingSidebar?.id ? Number(matchingSidebar.id) : null;
});

// Get visible menu items for current sidebar
const visibleMenuItems = computed(() => {
  if (!currentSidebar.value) return [];

  // Use registry data (now includes children)
  const items = getMenuItemsBySidebar(currentSidebar.value);
  return items;
});
</script>

<template>
  <nav
    class="flex flex-col space-y-1 bg-gradient-to-b from-background to-muted/5 p-2"
  >
    <!-- Empty state when no menu items available -->
    <template v-if="visibleMenuItems.length === 0">
      <div
        class="bg-gradient-to-br from-muted/20 to-muted/10 rounded-xl p-8 border border-muted/30"
      >
        <div class="flex flex-col items-center justify-center text-center">
          <div
            class="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mb-4"
          >
            <UIcon name="lucide:list" class="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 class="font-semibold text-foreground mb-2">
            No menu items available
          </h3>
          <p class="text-sm text-muted-foreground">
            Contact your administrator to get access
          </p>
        </div>
      </div>
    </template>

    <!-- Render menu items -->
    <template v-else>
      <div v-for="item in visibleMenuItems" :key="item.id" class="space-y-1">
        <PermissionGate :condition="item.permission as any">
          <!-- Menu item with children (collapsible) -->
          <div
            v-if="
              item.type === 'Dropdown Menu' ||
              (item.type === 'Menu' && hasChildren(item))
            "
            class="bg-gradient-to-r from-muted/20 to-muted/10 rounded-xl border border-muted/30 overflow-hidden"
          >
            <!-- Parent Menu Item -->
            <UButton
              size="lg"
              variant="ghost"
              color="neutral"
              :icon="item.icon"
              :class="[
                'w-full justify-start text-left rounded-lg group mb-1',
                'transition-all duration-200',
                isExpanded(item.id)
                  ? 'bg-gradient-to-r from-primary/20 to-secondary/20 shadow-md'
                  : 'lg:hover:bg-gradient-to-r lg:hover:from-primary/10 lg:hover:to-secondary/10',
              ]"
              @click="toggleExpanded(item.id)"
            >
              <template #leading>
                <div
                  :class="[
                    'w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center',
                    'transition-colors duration-200',
                  ]"
                >
                  <UIcon
                    :name="item.icon || 'lucide:box'"
                    size="16"
                    class="text-primary"
                  />
                </div>
              </template>
              <template #trailing>
                <div class="flex items-center flex-grow justify-end">
                  <UIcon
                    :name="
                      isExpanded(item.id)
                        ? 'lucide:chevron-down'
                        : 'lucide:chevron-right'
                    "
                    :class="[
                      'text-primary',
                      'transition-transform duration-200',
                      isExpanded(item.id) ? 'rotate-0 scale-125' : 'rotate-0',
                    ]"
                    size="18"
                  />
                </div>
              </template>
              <div class="flex flex-col items-start">
                <span class="text-sm font-medium text-foreground">{{
                  item.label
                }}</span>
              </div>
            </UButton>

            <!-- Children items - only show if there are children -->
            <div
              v-if="hasChildren(item) && isExpanded(item.id)"
              class="bg-muted/10 pl-3 pb-3 space-y-1"
            >
              <PermissionGate
                v-for="child in item.children?.sort((a, b) => (a.order || 0) - (b.order || 0))"
                :key="child.id"
                :condition="child.permission as any"
              >
                <NuxtLink
                  :to="child.path || child.route"
                  :class="[
                    'flex items-center gap-3 w-full px-3 py-2 rounded-lg group lg:hover:bg-background/50 border border-transparent',
                    'transition-all duration-200',
                    isItemActive(child.path || child.route)
                      ? 'font-semibold'
                      : 'lg:hover:border-muted/50',
                  ]"
                  @click="handleMenuClick"
                >
                  <div
                    class="w-6 h-6 rounded-md bg-gradient-to-br from-info/20 to-success/20 flex items-center justify-center"
                  >
                    <UIcon :name="child.icon" size="14" class="text-info" />
                  </div>
                  <span
                    :class="[
                      'text-sm truncate',
                      'transition-colors duration-200',
                      isItemActive(child.path || child.route)
                        ? 'text-primary'
                        : 'text-foreground',
                    ]"
                  >
                    {{ child.label }}
                  </span>
                </NuxtLink>
              </PermissionGate>
            </div>
          </div>

          <!-- Regular menu item (link) -->
          <div
            v-else
            :class="[
              'bg-gradient-to-r from-background to-muted/10 rounded-xl border border-muted/30 lg:hover:shadow-lg',
              'transition-all duration-200',
            ]"
          >
            <UButton
              size="lg"
              variant="ghost"
              color="neutral"
              :icon="item.icon"
              :to="item.path || item.route"
              :class="[
                'w-full justify-start text-left hover:bg-gradient-to-r lg:hover:from-primary/10 lg:hover:to-secondary/10 rounded-lg group',
                'transition-all duration-200',
                isItemActive(item.path || item.route)
                  ? 'bg-gradient-to-r from-primary/20 to-secondary/20 font-semibold text-primary shadow-md'
                  : '',
              ]"
              @click="handleMenuClick"
            >
              <template #leading>
                <div
                  :class="[
                    'w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center',
                    'transition-colors duration-200',
                  ]"
                >
                  <UIcon
                    :name="item.icon || 'lucide:box'"
                    size="16"
                    class="text-primary"
                  />
                </div>
              </template>
              <span class="text-sm font-medium">{{ item.label }}</span>
            </UButton>
          </div>
        </PermissionGate>
      </div>
    </template>
  </nav>
</template>
