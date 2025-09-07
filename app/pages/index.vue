<template>
  <div class="w-full">
    <!-- Header -->
    <CommonPageHeader
      title="Enfyra App"
      title-size="md"
      variant="minimal"
      show-background
      background-gradient="from-purple-500/5 via-violet-400/3 to-transparent"
      padding-y="py-4"
    />

    <CommonEmptyState
      title="Welcome to Enfyra"
      description="Your modern application platform. Manage data, files, settings, and more. Select a category from the sidebar to get started."
      icon="lucide:home"
      size="lg"
    />
  </div>
</template>

<script setup lang="ts">
// Root index page - overview only
// Main navigation is handled through sidebar menu
</script>
