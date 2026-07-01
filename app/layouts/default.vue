<template>
  <div class="flex flex-1 text-sm" style="height: 100dvh; background: var(--shell-content-bg); color: var(--text-primary);">

    <a
      href="#main-content"
      class="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-[var(--action-primary-bg)] focus:text-[var(--action-primary-text)] focus:px-4 focus:py-2 focus:rounded-xl"
    >
      Skip to main content
    </a>

    <SidebarUnifiedSidebar />

    <main
      id="main-content"
      class="relative flex flex-1 flex-col min-h-0 overflow-hidden"
      :style="{ background: 'transparent' }"
    >
      <header class="sticky top-0 flex w-full z-50 backdrop-blur-xl" :style="{ background: 'transparent' }">
        <div class="flex flex-col items-center justify-between grow lg:flex-row">
          <div class="flex items-center justify-between w-full gap-2 sm:gap-4 lg:justify-normal lg:border-b-0 h-16">
            <div class="flex items-center justify-between gap-4 flex-1 px-4 lg:px-6">
              <LayoutHeader />
            </div>
          </div>
        </div>
      </header>

      <Transition name="metadata-banner">
        <div
          v-if="showReloadBanner"
          key="metadata-banner"
          class="pointer-events-none absolute right-4 top-[72px] z-[60] max-w-[min(420px,calc(100vw-2rem))] lg:right-6"
        >
          <div class="pointer-events-auto flex items-center gap-2 rounded-full border border-[var(--card-border)] bg-[var(--surface-default)]/90 px-3 py-2 text-sm font-semibold text-[var(--text-secondary)] shadow-[var(--shadow-md)] backdrop-blur-xl">
            <UIcon
              :name="isReloading ? 'lucide:loader-circle' : 'lucide:check-circle'"
              class="h-4 w-4 shrink-0 text-[var(--state-primary-soft-text)]"
              :class="isReloading ? 'animate-spin' : ''"
            />
            <span class="truncate">{{ bannerTitle }}</span>
            <UButton
              v-if="!isReloading"
              icon="lucide:x"
              color="neutral"
              variant="ghost"
              size="xs"
              aria-label="Dismiss reload status"
              class="-mr-1 h-6 w-6 rounded-full p-0"
              @click="dismissReloadBanner"
            />
          </div>
        </div>
      </Transition>

      <LayoutSubHeader v-if="!hasPageHeader && hasSubHeaderActions && width >= 1024" />

      <section class="flex-1 min-h-0 overflow-y-auto relative app-workspace" :style="{ background: 'transparent' }">
        <div class="flex flex-col flex-1 min-h-full gap-4 px-5 py-4 lg:px-6">
          <CommonPageHeader
            v-if="hasPageHeader"
            :key="`${pageHeader!.title}-${pageHeader?.description || ''}-${pageHeader?.variant || 'default'}-${pageHeader?.gradient || 'none'}-${pageHeader?.leadingIcon ?? ''}-${pageHeader?.hideLeadingIcon ? '0' : '1'}`"
            :title="pageHeader!.title"
            :description="pageHeader?.description"
            :stats="pageHeader?.stats ? [...pageHeader.stats] : undefined"
            :variant="pageHeader?.variant"
            :gradient="pageHeader?.gradient"
            :leading-icon="pageHeader?.leadingIcon"
            :hide-leading-icon="pageHeader?.hideLeadingIcon"
          />
          <slot />
        </div>
      </section>
    </main>
  </div>

  <div id="others-overlay"></div>

  <CommonGlobalConfirm />
  <CommonGlobalNotify />
  <DynamicGlobalExtensionsHost />
  <FolderDetailModal />
  <CommonRouteLoading :show="routeLoading" message="Navigating..." />
</template>

<script setup lang="ts">
import {
  isReloading,
  showReloadBanner,
  reloadLabels,
  reloadDoneCountdown,
  dismissReloadBanner,
} from '~/composables/shared/useAdminSocket';

await useInitialData();
await Promise.all([
  useMenuInit(),
  useGlobalExtensionsInit({ throwOnError: true }),
]);
const { markInitialReady } = useInitialLoading();
markInitialReady();
useAppSettings();
useRouterErrorHandler();
useMobileMenuAction();
useNavigationActions();
useAdminSocket();

const { routeLoading } = useGlobalState();
const { width } = useScreen();
const { subHeaderActions } = useSubHeaderActionRegistry();
const { pageHeader, hasPageHeader } = usePageHeaderRegistry();

const hasSubHeaderActions = computed(() => subHeaderActions.value.length > 0);

const bannerTitle = computed(() => {
  if (isReloading.value) {
    const labels = reloadLabels.value;
    if (labels.length === 0) return 'Reloading…';
    if (labels.length === 1) return `Reloading ${labels[0]}…`;
    return `Reloading ${labels.join(', ')}…`;
  }
  return `Reload complete (${reloadDoneCountdown.value}s)`;
});
</script>

<style scoped>
.app-workspace {
  scrollbar-color: var(--scrollbar-thumb) transparent;
  scrollbar-width: thin;
}

.app-workspace::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

.app-workspace::-webkit-scrollbar-track {
  background: transparent;
}

.app-workspace::-webkit-scrollbar-thumb {
  border: 3px solid transparent;
  border-radius: 999px;
  background: var(--scrollbar-thumb);
  background-clip: padding-box;
}
</style>
