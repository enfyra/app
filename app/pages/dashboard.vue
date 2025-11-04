<template>
  <div class="w-full">
    <CommonEmptyState
      title="Dashboard"
      description="Welcome to your dashboard. Content and widgets will be provided by extensions. Select a category from the sidebar to get started."
      icon="lucide:layout-dashboard"
      size="lg"
    />
  </div>
</template>

<script setup lang="ts">
const { registerPageHeader } = usePageHeaderRegistry();

registerPageHeader({
  title: "Dashboard",
  description: "Welcome to your dashboard. Content and widgets will be provided by extensions. Select a category from the sidebar to get started.",
  variant: "minimal",
  gradient: "cyan",
});
</script>
