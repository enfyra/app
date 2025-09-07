<script setup lang="ts">
// Data index page - overview only
// Individual table data management features are accessed through sidebar navigation
</script>

<template>
  <div class="w-full">
    <!-- Header -->
    <CommonPageHeader
      title="Data Management"
      title-size="md"
      variant="minimal"
      show-background
      background-gradient="from-blue-500/5 via-cyan-400/3 to-transparent"
      padding-y="py-4"
    />

    <CommonEmptyState
      title="Data Management"
      description="View and manage your application data. Browse, create, and modify records across all tables. Select a table from the sidebar to get started."
      icon="lucide:list"
      size="lg"
    />
  </div>
</template>
