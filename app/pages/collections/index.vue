<script setup lang="ts">
// Collections index page - overview only
// Individual table management features are accessed through sidebar navigation

// Register page header
const { registerPageHeader } = usePageHeaderRegistry();

registerPageHeader({
  title: "Table Collections",
  description: "Manage your database table structures and schemas. Create, modify, and organize your data models. Select a table from the sidebar to get started.",
  variant: "minimal",
  gradient: "purple",
});
</script>

<template>
  <div class="w-full">
    <CommonEmptyState
      title="Table Collections"
      description="Manage your database table structures and schemas. Create, modify, and organize your data models. Select a table from the sidebar to get started."
      icon="lucide:database"
      size="lg"
    />
  </div>
</template>
