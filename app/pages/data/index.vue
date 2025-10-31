<script setup lang="ts">
// Data index page - overview only
// Individual table data management features are accessed through sidebar navigation

// Register page header
const { registerPageHeader } = usePageHeaderRegistry();

registerPageHeader({
  title: "Data Management",
  description: "View and manage your application data. Browse, create, and modify records across all tables. Select a table from the sidebar to get started.",
  variant: "minimal",
  gradient: "cyan",
});
</script>

<template>
  <div class="w-full">
    <CommonEmptyState
      title="Data Management"
      description="View and manage your application data. Browse, create, and modify records across all tables. Select a table from the sidebar to get started."
      icon="lucide:list"
      size="lg"
    />
  </div>
</template>
