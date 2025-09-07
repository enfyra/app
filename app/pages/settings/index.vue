<template>
  <div class="w-full">
    <!-- Header -->
    <CommonPageHeader
      title="System Settings"
      title-size="md"
      variant="minimal"
      show-background
      background-gradient="from-gray-500/5 via-gray-400/3 to-transparent"
      padding-y="py-4"
    />

    <CommonEmptyState
      title="System Settings"
      description="Manage your system configuration, users, roles, menus, extensions, and more. Select a setting category from the sidebar to get started."
      icon="lucide:settings"
      size="lg"
    />
  </div>
</template>

<script setup lang="ts">
// Settings index page - overview only
// Individual settings are accessed through sidebar navigation with permission checks
</script>
