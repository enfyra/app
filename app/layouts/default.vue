<template>
  <div class="flex flex-1 text-sm" style="height: 100dvh; background: var(--surface-chrome); color: var(--text-primary);">

    <a
      href="#main-content"
      class="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-violet-500 focus:text-white focus:px-4 focus:py-2 focus:rounded-xl"
    >
      Skip to main content
    </a>

    <SidebarUnifiedSidebar />

    <main
      class="flex-1 flex flex-col min-h-0 overflow-hidden peer-data-[variant=inset]:m-4 peer-data-[variant=inset]:rounded-xl"
      :style="{
        background: 'var(--surface-default)',
        boxShadow: 'var(--shadow-inset-card)',
        border: '1px solid var(--border-default)',
      }"
      id="main-content"
    >
      <header class="sticky top-0 flex w-full z-50" :style="{ borderBottom: '1px solid var(--border-default)', background: 'var(--surface-header)' }">
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
          v-if="showMetadataBanner"
          key="metadata-banner"
          class="shrink-0 overflow-hidden"
        >
          <UBanner
            :color="isMetadataReloading ? 'neutral' : 'primary'"
            :icon="isMetadataReloading ? 'lucide:loader-circle' : 'lucide:check-circle'"
            :title="isMetadataReloading ? 'Loading metadata…' : `Metadata updated (${metadataReloadCountdown}s)`"
            class="border-b border-[var(--border-default)] shrink-0"
            :ui="{ icon: isMetadataReloading ? 'animate-spin' : '' }"
          >
            <template #close>
              <UButton
                v-if="!isMetadataReloading"
                icon="lucide:x"
                variant="ghost"
                size="xs"
                @click="dismissMetadataBanner"
              />
            </template>
          </UBanner>
        </div>
      </Transition>

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

      <LayoutSubHeader v-if="!hasPageHeader && hasSubHeaderActions && width >= 1024" />

      <section class="flex-1 min-h-0 overflow-y-auto relative" :style="{ background: 'var(--surface-muted)' }">
        <div class="px-4 py-4 lg:px-6 lg:py-6 flex flex-col flex-1 min-h-full">
          <slot />
        </div>
      </section>
    </main>
  </div>

  <div id="others-overlay"></div>

  <CommonGlobalConfirm />
  <CommonGlobalNotify />
  <FolderDetailModal />
  <RouteLoading :show="routeLoading" message="Navigating..." />
</template>

<script setup lang="ts">
import { metadataReloading, metadataReloadDone, metadataReloadCountdown, dismissMetadataBanner } from '~/composables/shared/useAdminSocket';

await useInitialData();
await useMenuInit();
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

const showMetadataBanner = computed(() => metadataReloading.value || metadataReloadDone.value);
const isMetadataReloading = computed(() => metadataReloading.value);
</script>
