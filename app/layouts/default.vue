<template>
  <UDashboardGroup
    :persistent="false"
    class="bg-[var(--shell-bg)] text-sm text-[var(--text-primary)] p-[var(--shell-mobile-inset)] lg:ps-0 lg:py-[var(--shell-inset)] lg:pe-[var(--shell-inset)]"
  >
    <a
      href="#dashboard-panel-workspace"
      class="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-[var(--action-primary-bg)] focus:text-[var(--action-primary-text)] focus:px-4 focus:py-2 focus:rounded-xl"
    >
      Skip to main content
    </a>

    <SidebarUnifiedSidebar />

    <UTheme :ui="pageSurfaceUi" :props="{ pageCard: { variant: 'outline' } }">
      <UDashboardPanel
        id="workspace"
        role="main"
        tabindex="-1"
        class="eapp-shell-main overflow-hidden bg-[var(--shell-main-bg)] rounded-[var(--radius-shell)] border border-default shadow-sm"
        :ui="{ root: 'min-h-0' }"
      >
        <template #header>
          <UDashboardNavbar
            as="header"
            :toggle="false"
            class="bg-[var(--shell-main-bg)]"
            :ui="{ left: 'flex-1', right: 'hidden' }"
          >
            <template #left>
              <LayoutHeader />
            </template>
          </UDashboardNavbar>
          <CommonPageHeader
            v-if="hasPageHeader"
            class="bg-[var(--shell-main-bg)]"
            :title="pageHeader!.title"
            :description="pageHeader?.description"
            :stats="pageHeader?.stats ? [...pageHeader.stats] : undefined"
            :variant="pageHeader?.variant"
            :gradient="pageHeader?.gradient"
            :leading-icon="pageHeader?.leadingIcon"
            :hide-leading-icon="pageHeader?.hideLeadingIcon"
          />
          <LayoutSubHeader v-if="!hasPageHeader && hasSubHeaderActions" class="bg-[var(--shell-main-bg)]" />
        </template>

        <template #body>
          <section ref="workspaceContent" class="relative flex flex-1 flex-col gap-4 app-workspace">
            <UContainer class="grid min-w-0 w-full flex-1 route-stack px-0 sm:px-0 lg:px-0">
              <slot />
            </UContainer>
            <CommonRouteLoading :show="routeLoadingVisible" message="Navigating..." />
          </section>
        </template>
      </UDashboardPanel>
    </UTheme>

    <Transition name="metadata-banner">
      <div
        v-if="showReloadBanner"
        key="metadata-banner"
        class="pointer-events-none fixed right-4 top-[72px] z-[60] max-w-[min(420px,calc(100vw-2rem))] lg:right-10 lg:top-[calc(var(--shell-inset)+72px)]"
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

  </UDashboardGroup>

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

const pageSurfaceUi = {
  card: {
    root: 'rounded-[var(--radius-card)] border border-default bg-default ring-0 shadow-none',
    header: 'px-3 py-3 sm:px-3 md:px-6 md:py-4',
    body: 'p-3 sm:p-3 md:p-6',
    footer: 'px-3 py-3 sm:px-3 md:px-6 md:py-4',
  },
  pageCard: {
    root: 'rounded-[var(--radius-card)] border border-default bg-default ring-0 shadow-none',
    container: 'p-3 md:p-6',
  },
};

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
const { visibleActions: subHeaderActions } = useSubHeaderActionPresentation();
const { pageHeader, hasPageHeader } = usePageHeaderRegistry();
const workspaceContent = useTemplateRef<HTMLElement>('workspaceContent');
const workspaceScroll = computed(() => workspaceContent.value?.parentElement ?? null);
useWorkspaceScroll(workspaceScroll);

watch(() => route.path, async () => {
  await nextTick();
  document.getElementById('dashboard-panel-workspace')?.focus({ preventScroll: true });
});

await useInitialData();
await Promise.all([
  useMenuInit(),
  useGlobalExtensionsInit({ throwOnError: false }),
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
.route-stack > * {
  grid-area: 1 / 1;
  min-width: 0;
  width: 100%;
  justify-self: center;
}

.route-stack {
  grid-template-columns: minmax(0, 1fr);
}
</style>
