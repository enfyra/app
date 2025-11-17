<template>
  <div class="flex h-screen text-sm bg-background text-foreground overflow-x-hidden">
    <!-- Skip Link for Keyboard Navigation -->
    <a
      href="#main-content"
      class="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-primary focus:text-white focus:px-4 focus:py-2 focus:rounded"
    >
      Skip to main content
    </a>

    <!-- Unified Sidebar -->
    <aside
      v-if="sidebarVisible || !isTabletOrMobile"
      class="border-r flex flex-col flex-shrink-0 transition-all duration-500 ease-out"
      :class="[
        isTabletOrMobile
          ? 'fixed inset-y-0 left-0 w-72 z-[70] shadow-2xl backdrop-blur-xl'
          : (sidebarCollapsed ? 'w-20' : 'w-72')
      ]"
      :style="{
        background: 'var(--bg-surface)',
        borderColor: 'var(--border-subtle)',
      }"
      aria-label="Primary navigation"
    >
      <SidebarUnifiedSidebar />
    </aside>

    <!-- Overlay for tablet/mobile -->
    <div
      v-if="sidebarVisible && isTabletOrMobile"
      class="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] transition-opacity duration-300"
      @click="setSidebarVisible(false)"
      role="presentation"
      aria-hidden="true"
    ></div>

    <!-- Main Content -->
    <main
      class="flex-1 flex flex-col min-h-0 relative overflow-x-hidden"
      :style="{ background: 'var(--bg-app)' }"
      id="main-content"
    >
      <!-- Layout Header (Breadcrumbs OR Actions) - Styled via useHeaderStyleRegistry -->
      <header
        :class="headerContainerClasses"
        :style="headerContainerStyle"
      >
        <!-- Accent line (gradient line on top/bottom of header) -->
        <div
          v-if="headerAccentLine?.enabled"
          class="absolute left-0 right-0"
          :class="headerAccentLine.position === 'bottom' ? 'bottom-0' : 'top-0'"
          :style="{
            height: headerAccentLine.height || '1px',
            background: headerAccentLine.gradient || 'linear-gradient(90deg, transparent 0%, rgba(124, 58, 237, 0.4) 50%, transparent 100%)'
          }"
        ></div>

        <div :class="headerContentClasses" :style="headerContentStyle">
          <!-- Header Content (Breadcrumbs/Actions from LayoutHeader) -->
          <LayoutHeader />
        </div>
      </header>

      <!-- Page Header (optional - registered by pages) -->
      <CommonPageHeader
        v-if="hasPageHeader"
        :key="`${pageHeader!.title}-${pageHeader?.description || ''}-${pageHeader?.variant || 'default'}-${pageHeader?.gradient || 'none'}`"
        :title="pageHeader!.title"
        :description="pageHeader?.description"
        :stats="pageHeader?.stats ? [...pageHeader.stats] : undefined"
        :variant="pageHeader?.variant"
        :gradient="pageHeader?.gradient"
      />

      <!-- Sub Header (optional secondary toolbar) -->
      <LayoutSubHeader v-if="hasSubHeaderActions && width >= 1024" />

      <!-- Page Content -->
      <section class="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-thin relative z-10">
        <div class="p-3 md:p-6 pb-32 lg:pb-6 h-full overflow-y-auto">
          <slot />
        </div>
      </section>
    </main>
  </div>

  <!-- Confirm Modal -->
  <div id="others-overlay"></div>

  <CommonGlobalConfirm />
  <FolderDetailModal />
  <RouteLoading :show="routeLoading" message="Navigating..." />
</template>

<script setup lang="ts">
const { sidebarVisible, sidebarCollapsed, routeLoading, setSidebarVisible } =
  useGlobalState();
const { width } = useScreen();
const { subHeaderActions } = useSubHeaderActionRegistry();

// Header style registry
const {
  containerStyle: headerContainerStyle,
  containerClasses: headerContainerClasses,
  contentStyle: headerContentStyle,
  contentClasses: headerContentClasses,
  accentLineConfig: headerAccentLine,
} = useHeaderStyleRegistry();

const { pageHeader, hasPageHeader } = usePageHeaderRegistry();

const isTabletOrMobile = computed(() => width.value <= 1024);
const hasSubHeaderActions = computed(() => subHeaderActions.value.length > 0);

// Sidebar behavior
watch(
  isTabletOrMobile,
  (isMobileOrTablet) => {
    if (isMobileOrTablet) {
      if (sidebarVisible.value) {
        setSidebarVisible(false);
      }
    } else {
      if (!sidebarVisible.value) {
        setSidebarVisible(true);
      }
    }
  },
  { immediate: true }
);
</script>

<style scoped>
/* No custom styles needed - using Tailwind */
</style>
