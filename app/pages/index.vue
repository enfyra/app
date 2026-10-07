<template>
  <div class="w-full">
    <CommonEmptyState
      :title="settings.defaultPage ? 'Default page unavailable' : 'Welcome to Enfyra'"
      :description="settings.defaultPage ? 'Your default page is unavailable or you do not have access. Choose another page from the sidebar.' : 'Select a category from the sidebar to get started. A default page can be configured in General Settings.'"
      icon="lucide:home"
      size="lg"
    />
  </div>
</template>

<script setup lang="ts">
import { resolveDefaultPage } from '~/utils/default-page';
const { settings } = useGlobalState();
const { menuItems } = useMenuRegistry();
const { hasMenuPermission } = usePermissions();
const { initialReady } = useInitialLoading();
const route = useRoute();
onMounted(() => {
  const destination = initialReady.value && resolveDefaultPage(settings.value.defaultPage, menuItems.value, hasMenuPermission);
  if (destination && route.path === '/') void navigateTo(destination, { replace: true });
});

const { registerPageHeader } = usePageHeaderRegistry();

registerPageHeader({
  title: "Enfyra App",
  gradient: "purple",
  variant: "minimal",
});
</script>
