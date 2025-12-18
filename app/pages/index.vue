<template>
  <div class="w-full">
    <CommonEmptyState
      title="Welcome to Enfyra"
      description="Your modern application platform. Manage data, files, settings, and more. Select a category from the sidebar to get started."
      icon="lucide:home"
      size="lg"
    />
  </div>
</template>

<script setup lang="ts">

const { registerPageHeader } = usePageHeaderRegistry();

registerPageHeader({
  title: "Enfyra App",
  gradient: "purple",
  variant: "minimal",
});
</script>
