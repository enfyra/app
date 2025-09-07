<template>
  <div class="w-full">
    <!-- Header -->
    <CommonPageHeader
      title="Dashboard"
      title-size="md"
      variant="minimal"
      show-background
      background-gradient="from-green-500/5 via-emerald-400/3 to-transparent"
      padding-y="py-4"
    />

    <CommonEmptyState
      title="Dashboard"
      description="Welcome to your dashboard. Content and widgets will be provided by extensions. Select a category from the sidebar to get started."
      icon="lucide:layout-dashboard"
      size="lg"
    />
  </div>
</template>

<script setup lang="ts">
// Dashboard page - overview only
// Content and widgets will be provided by extensions
</script>
