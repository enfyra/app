<template>
  <div class="w-full">
    <CommonEmptyState
      title="File Manager"
      description="Manage your files, folders, and media assets. Upload, organize, and share files across your system. Select a file category from the sidebar to get started."
      icon="lucide:folder-open"
      size="lg"
    />
  </div>
</template>

<script setup lang="ts">
const { registerPageHeader } = usePageHeaderRegistry();

registerPageHeader({
  title: "File Manager",
  description: "Manage your files, folders, and media assets. Upload, organize, and share files across your system. Select a file category from the sidebar to get started.",
  variant: "minimal",
  gradient: "blue",
});
</script>
