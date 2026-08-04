<template>
  <div class="flex min-h-dvh text-sm" style="background: var(--shell-content-bg); color: var(--text-primary);">

    <a
      href="#main-content"
      class="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-[var(--action-primary-bg)] focus:text-[var(--action-primary-text)] focus:px-4 focus:py-2 focus:rounded-xl"
    >
      Skip to main content
    </a>

    <SidebarUnifiedSidebar />

    <main
      id="main-content"
      tabindex="-1"
      class="relative flex min-w-0 flex-1 flex-col"
      :style="{ background: 'transparent' }"
    >
      <header class="sticky top-0 flex w-full z-50 backdrop-blur-xl" :style="{ background: 'transparent' }">
        <div class="flex flex-col items-center justify-between grow lg:flex-row">
          <div class="flex items-center justify-between w-full gap-2 sm:gap-4 lg:justify-normal lg:border-b-0 h-16">
            <div class="flex flex-1 items-center justify-between gap-4 px-4 lg:px-6">
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
          <div
            class="pointer-events-auto flex items-center gap-2 rounded-full border bg-[var(--surface-default)]/90 px-3 py-2 text-sm font-semibold shadow-[var(--shadow-md)] backdrop-blur-xl"
            :class="reloadFailureMessage ? 'border-[var(--state-danger-outline-border)] bg-[var(--state-danger-soft-bg)] text-[var(--state-danger-soft-text)]' : 'border-[var(--card-border)] text-[var(--text-secondary)]'"
          >
            <UIcon
              :name="reloadFailureMessage ? 'lucide:circle-alert' : isReloading ? 'lucide:loader-circle' : 'lucide:check-circle'"
              class="h-4 w-4 shrink-0"
              :class="reloadFailureMessage ? 'text-[var(--state-danger-soft-text)]' : 'text-[var(--state-primary-soft-text)]'"
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

      <section class="relative flex-1 app-workspace">
        <div class="relative flex flex-col flex-1 min-h-full gap-4 px-5 py-4 lg:px-6">
          <CommonPageHeader
            v-if="hasPageHeader"
            :title="pageHeader!.title"
            :description="pageHeader?.description"
            :stats="pageHeader?.stats ? [...pageHeader.stats] : undefined"
            :variant="pageHeader?.variant"
            :gradient="pageHeader?.gradient"
            :leading-icon="pageHeader?.leadingIcon"
            :hide-leading-icon="pageHeader?.hideLeadingIcon"
          />
          <div class="grid min-w-0 w-full flex-1 route-stack">
            <slot />
          </div>
        </div>
        <CommonRouteLoading :show="routeLoadingVisible" message="Navigating..." />
      </section>
    </main>
  </div>

  <div id="others-overlay"></div>

  <CommonGlobalConfirm />
  <DynamicGlobalExtensionsHost />
  <FolderDetailModal />
</template>

<script setup lang="ts">
import {
  isReloading,
  showReloadBanner,
  reloadLabels,
  reloadDoneCountdown,
  reloadFailureMessage,
  dismissReloadBanner,
} from '~/composables/shared/useAdminSocket';

const { markInitialReady } = useInitialLoading();
const { loadRoutes } = useRoutes();
const { registerDataMenuItemsFromRoutes } = useMenuRegistry();
useAppSettings();
useRouterErrorHandler();
useMobileMenuAction();
useNavigationActions();
useAdminSocket();

const { routeLoadingVisible } = useGlobalState();
const route = useRoute();
const { width } = useScreen();
const { subHeaderActions } = useSubHeaderActionRegistry();
const { pageHeader, hasPageHeader } = usePageHeaderRegistry();
useWorkspaceScroll();

watch(() => route.path, async () => {
  await nextTick();
  document.getElementById('main-content')?.focus({ preventScroll: true });
});

await useInitialData();
await Promise.all([
  useMenuInit(),
  useGlobalExtensionsInit({ throwOnError: true }),
]);
markInitialReady();
if (import.meta.client) {
  void nextTick(() => {
    requestAnimationFrame(() => {
      void loadRoutes().then((loadedRoutes) => {
        if (!loadedRoutes) return;
        registerDataMenuItemsFromRoutes(loadedRoutes);
      });
    });
  });
}

const hasSubHeaderActions = computed(() => subHeaderActions.value.length > 0);

const bannerTitle = computed(() => {
  if (reloadFailureMessage.value) return reloadFailureMessage.value;
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
  background: var(--bg-app);
}

.route-stack > * {
  grid-area: 1 / 1;
  min-width: 0;
}

.route-stack {
  grid-template-columns: minmax(0, 1fr);
}
</style>
