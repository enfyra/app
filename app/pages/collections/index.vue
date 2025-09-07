<script setup lang="ts">
// Collections index page - overview only
// Individual table management features are accessed through sidebar navigation
</script>

<template>
  <div class="w-full">
    <!-- Header -->
    <CommonPageHeader
      title="Table Collections"
      title-size="md"
      variant="minimal"
      show-background
      background-gradient="from-primary-500/5 via-primary-400/3 to-transparent"
      padding-y="py-4"
    />

    <CommonEmptyState
      title="Table Collections"
      description="Manage your database table structures and schemas. Create, modify, and organize your data models. Select a table from the sidebar to get started."
      icon="lucide:database"
      size="lg"
    />
  </div>
</template>
