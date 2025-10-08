<script setup lang="ts">
const route = useRoute();
const { miniSidebars, bottomMiniSidebars } = useMenuRegistry();
const { checkPermissionCondition } = usePermissions();
const { isTablet } = useScreen();
const { setSidebarVisible } = useGlobalState();

const items = computed(() => {
  // Use only registered mini sidebars - Dashboard will be registered in extension
  const registeredItems = miniSidebars.value
    .filter((sidebar) => {
      if (!sidebar.permission) return true;
      return checkPermissionCondition(sidebar.permission);
    })
    .map((sidebar) => ({
      label: sidebar.label,
      icon: sidebar.icon,
      route: sidebar.route,
      onClick: sidebar.onClick,
      class: sidebar.class,
      show: true,
      hasRoute: !!sidebar.route,
    }));

  return registeredItems;
});

const bottomItems = computed(() => {
  // Process bottom mini sidebars
  const registeredBottomItems = bottomMiniSidebars.value
    .filter((sidebar) => {
      if (!sidebar.permission) return true;
      return checkPermissionCondition(sidebar.permission);
    })
    .map((sidebar) => ({
      label: sidebar.label,
      icon: sidebar.icon,
      route: sidebar.route,
      onClick: sidebar.onClick,
      class: sidebar.class,
      show: true,
      hasRoute: !!sidebar.route,
    }));

  return registeredBottomItems;
});

const isActive = (path: string | undefined) => {
  if (!path) return false;

  // Handle dashboard route specifically
  if (path === "/dashboard") {
    return (
      route.path === "/dashboard" ||
      route.path === "/" ||
      route.path.startsWith("/dashboard/")
    );
  }

  // For other routes, check if current path starts with item route
  return route.path.startsWith(path);
};

// Handle item click - show sidebar on tablet if hidden
const handleItemClick = (item: any) => {
  // If on tablet and sidebar is hidden, show it first
  if (isTablet.value) {
    setSidebarVisible(true);
  }

  // Then execute the original onClick if exists
  if (item.onClick) {
    item.onClick();
  }
};
</script>

<template>
  <div class="flex flex-col h-full w-full p-2">
    <!-- Navigation Section -->
    <div class="flex flex-col items-center w-full space-y-3">
      <UTooltip
        v-for="item in items.filter((item) => item.show)"
        :key="item.icon"
        :text="item.label"
        :content="{ side: 'right', sideOffset: 8 }"
        :delay-duration="0"
        arrow
      >
        <div
          class="relative group"
          :class="[
            isActive(item.route)
              ? 'bg-gradient-to-br from-primary/20 to-secondary/20 rounded-xl p-1 shadow-lg border border-primary/30'
              : `lg:hover:!bg-gradient-to-br lg:hover:!from-muted/20 lg:hover:!to-muted/10 rounded-xl p-1 border border-transparent lg:hover:!border-muted/30 transition-colors duration-200 lg:active:bg-gradient-to-br lg:active:from-muted/20 lg:active:to-muted/10`,
          ]"
        >
          <UButton
            variant="ghost"
            :icon="item.icon"
            :to="item.hasRoute ? item.route : undefined"
            @click="handleItemClick(item)"
            :class="[
              'w-10 h-10 flex justify-center items-center rounded-lg',
              'transition-colors duration-200',
              isActive(item.route)
                ? 'bg-gradient-to-br from-primary/30 to-secondary/30 text-primary shadow-md'
                : 'text-muted-foreground lg:hover:!text-primary bg-gradient-to-br lg:hover:!from-background lg:hover:!to-muted/20',
              item.class || '',
            ]"
          />
          <!-- Active indicator -->
          <div
            v-if="isActive(item.route)"
            class="absolute -right-1 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-primary to-secondary rounded-full"
          />
        </div>
      </UTooltip>
    </div>

    <!-- Bottom Section: Bottom Items -->
    <div class="mt-auto w-full">
      <div
        v-if="bottomItems.length > 0"
        class="flex flex-col items-center w-full space-y-3"
      >
        <!-- Separator -->
        <div
          class="w-8 h-px bg-gradient-to-r from-transparent via-muted/50 to-transparent"
        />

        <UTooltip
          v-for="item in bottomItems.filter((item) => item.show)"
          :key="item.icon"
          :text="item.label"
          :content="{ side: 'right', sideOffset: 8 }"
          :delay-duration="0"
          arrow
        >
          <div
            class="relative group"
            :class="[
              isActive(item.route)
                ? 'bg-gradient-to-br from-warning/20 to-error/20 rounded-xl p-1 shadow-lg border border-warning/30'
                : `lg:hover:!bg-gradient-to-br lg:hover:!from-muted/20 lg:hover:!to-muted/10 rounded-xl p-1 border border-transparent lg:hover:!border-muted/30 transition-colors duration-200 lg:active:bg-gradient-to-br lg:active:from-muted/20 lg:active:to-muted/10`,
            ]"
          >
            <UButton
              variant="ghost"
              :icon="item.icon"
              :to="item.hasRoute ? item.route : undefined"
              @click="handleItemClick(item)"
              :class="[
                'w-10 h-10 flex justify-center items-center rounded-lg',
                'transition-colors duration-200',
                isActive(item.route)
                  ? 'bg-gradient-to-br from-warning/30 to-error/30 text-warning shadow-md'
                  : 'text-muted-foreground lg:hover:!text-warning bg-gradient-to-br lg:hover:!from-background lg:hover:!to-muted/20',
                item.class || '',
              ]"
            />
            <!-- Active indicator -->
            <div
              v-if="isActive(item.route)"
              class="absolute -right-1 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-warning to-error rounded-full"
            />
          </div>
        </UTooltip>
      </div>
    </div>
  </div>
</template>
