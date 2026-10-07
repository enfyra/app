<template>
  <div class="w-full min-w-0 space-y-6">
    <CommonPanel :sections="[{ value: 'welcome' }]">
      <template #welcome>
        <div class="flex flex-col gap-5 md:flex-row md:items-start md:gap-6">
          <span class="eapp-accent-soft flex size-12 shrink-0 items-center justify-center rounded-[var(--radius-control)]" aria-hidden="true">
            <UIcon name="lucide:panels-top-left" class="size-6" />
          </span>
          <div class="min-w-0 space-y-3">
            <p class="text-sm font-medium text-muted break-words">{{ settings.projectName || 'Enfyra' }}</p>
            <h2 class="text-2xl font-semibold tracking-tight text-default md:text-3xl">Welcome to your workspace</h2>
            <p class="max-w-2xl text-sm leading-6 text-muted md:text-base">Open a page below to get started, or use the sidebar to explore your workspace.</p>
          </div>
        </div>
      </template>
    </CommonPanel>

    <UAlert
      v-if="settings.defaultPage"
      title="Default page unavailable"
      description="Your selected page is unavailable or you do not have access. You can still open another page from this workspace."
      icon="lucide:info"
      color="neutral"
      variant="subtle"
    />

    <section v-if="quickLinks.length" aria-labelledby="workspace-pages-title" class="space-y-3">
      <h2 id="workspace-pages-title" class="text-base font-semibold text-default">Explore your workspace</h2>
      <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <NuxtLink
          v-for="item in quickLinks"
          :key="item.id"
          :to="item.path || item.route"
          class="eapp-bordered-region flex min-w-0 items-start gap-3 p-4 transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <UIcon :name="item.icon || 'lucide:arrow-right'" class="eapp-accent-text mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <div class="min-w-0 flex-1">
            <p class="font-medium text-default break-words">{{ item.label }}</p>
            <p v-if="item.description" class="mt-1 line-clamp-2 text-sm leading-5 text-muted break-words">{{ item.description }}</p>
          </div>
          <UIcon name="lucide:chevron-right" class="mt-0.5 size-4 shrink-0 text-muted" aria-hidden="true" />
        </NuxtLink>
      </div>
    </section>

    <div v-if="settingsPage" class="flex flex-col gap-3 border-t border-default pt-5 md:flex-row md:items-center md:justify-between">
      <div class="min-w-0">
        <h2 class="text-sm font-medium text-default">Choose your starting page</h2>
        <p class="mt-1 text-sm leading-5 text-muted">Set a default page in General Settings to open it automatically when you sign in.</p>
      </div>
      <UButton :to="settingsPage.path || settingsPage.route" label="General Settings" icon="lucide:settings-2" color="neutral" variant="outline" class="self-start shrink-0" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { resolveDefaultPage } from '~/utils/default-page';
const { settings } = useGlobalState();
const { menuItems } = useMenuRegistry();
const { hasMenuPermission } = usePermissions();
const { initialReady } = useInitialLoading();
const route = useRoute();
const availablePages = computed(() => menuItems.value.filter(item => {
  const path = item.path || item.route;
  return item.isEnabled === true && !item.component && typeof path === 'string'
    && path.startsWith('/') && !path.startsWith('//') && path !== '/' && path !== '/login'
    && !/[:*?#\[\]\\\s]/.test(path) && hasMenuPermission(item);
}));
const quickLinks = computed(() => availablePages.value
  .filter(item => !item.parent)
  .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.label.localeCompare(b.label))
  .slice(0, 6));
const settingsPage = computed(() => availablePages.value.find(item => (item.path || item.route) === '/settings/general'));
onMounted(() => {
  const destination = initialReady.value && resolveDefaultPage(settings.value.defaultPage, menuItems.value, hasMenuPermission);
  if (destination && route.path === '/') void navigateTo(destination, { replace: true });
});

const { registerPageHeader } = usePageHeaderRegistry();

registerPageHeader({
  title: "Home",
  gradient: "none",
  variant: "minimal",
});
</script>
