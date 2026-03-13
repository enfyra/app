<template>
  <div ref="rootContainerRef" class="flex app-viewport-container text-sm text-foreground overflow-x-hidden gradient-mesh" style="height: 100dvh; background-color: var(--bg-app);">

    <a
      href="#main-content"
      class="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-violet-500 focus:text-white focus:px-4 focus:py-2 focus:rounded-xl"
    >
      Skip to main content
    </a>

    <aside
      v-if="(isTabletOrMobile && sidebarVisible) || !isTabletOrMobile"
      class="fixed top-0 left-0 flex flex-col flex-shrink-0 h-screen transition-all duration-300 ease-in-out z-99999 glass-sidebar w-[290px]"
      :class="[
        isTabletOrMobile && !sidebarVisible ? '-translate-x-full' : 'translate-x-0'
      ]"
      aria-label="Primary navigation"
    >
      <SidebarUnifiedSidebar />
    </aside>

    <div
      v-if="sidebarVisible && isTabletOrMobile"
      class="fixed inset-0 bg-black/60 backdrop-blur-md z-[60] transition-opacity duration-300"
      @click="setSidebarVisible(false)"
      role="presentation"
      aria-hidden="true"
    ></div>

    <main
      class="flex-1 flex flex-col min-h-0 relative overflow-x-hidden transition-all duration-300 ease-in-out"
      :class="[
        isTabletOrMobile
          ? 'ml-0'
          : 'lg:ml-[290px]'
      ]"
      id="main-content"
    >
      <header
        :class="[headerContainerClasses, 'sticky top-0 flex w-full z-99999 glass-header']"
        :style="headerContainerStyle"
      >
        <div
          v-if="headerAccentLine?.enabled"
          class="absolute left-0 right-0"
          :class="headerAccentLine.position === 'bottom' ? 'bottom-0' : 'top-0'"
          :style="{
            height: headerAccentLine.height || '2px',
            background: headerAccentLine.gradient || 'linear-gradient(90deg, transparent 0%, rgba(139, 92, 246, 0.6) 20%, rgba(34, 211, 238, 0.6) 50%, rgba(232, 121, 249, 0.6) 80%, transparent 100%)'
          }"
        ></div>

        <div class="flex flex-col items-center justify-between grow lg:flex-row">
          <div
            class="flex items-center justify-between w-full gap-2 sm:gap-4 lg:justify-normal lg:border-b-0 h-16"
          >
            <div :class="[headerContentClasses, 'flex-1']" :style="headerContentStyle">
              <LayoutHeader />
            </div>
          </div>
        </div>
      </header>

       <CommonPageHeader
            v-if="hasPageHeader"
            :key="`${pageHeader!.title}-${pageHeader?.description || ''}-${pageHeader?.variant || 'default'}-${pageHeader?.gradient || 'none'}`"
            :title="pageHeader!.title"
            :description="pageHeader?.description"
            :stats="pageHeader?.stats ? [...pageHeader.stats] : undefined"
            :variant="pageHeader?.variant"
            :gradient="pageHeader?.gradient"
          />

      <LayoutSubHeader v-if="!hasPageHeader && hasSubHeaderActions && width >= 1024" />

      <section class="flex-1 min-h-0 overflow-hidden relative z-10">
        <div class="px-4 py-4 lg:px-6 lg:py-6 h-full overflow-y-auto">
          <slot />
        </div>
      </section>
    </main>
  </div>

  <div id="others-overlay"></div>

  <CommonGlobalConfirm />
  <FolderDetailModal />
  <RouteLoading :show="routeLoading" message="Navigating..." />
</template>

<script setup lang="ts">
const { sidebarVisible, routeLoading, setSidebarVisible } =
  useGlobalState();
const { width } = useScreen();
const { subHeaderActions } = useSubHeaderActionRegistry();

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

const rootContainerRef = ref<HTMLElement | null>(null);

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

</style>
