<template>
  <div class="w-full">
    <!-- Header -->
    <CommonPageHeader
      title="File Manager"
      title-size="md"
      variant="minimal"
      show-background
      background-gradient="from-blue-500/5 via-indigo-400/3 to-transparent"
      padding-y="py-4"
    />

    <CommonEmptyState
      title="File Manager"
      description="Manage your files, folders, and media assets. Upload, organize, and share files across your system. Select a file category from the sidebar to get started."
      icon="lucide:folder-open"
      size="lg"
    />
  </div>
</template>

<script setup lang="ts">
// Files index page - overview only
// Individual file management features are accessed through sidebar navigation
</script>
