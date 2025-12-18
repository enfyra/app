<script setup lang="ts">

const { registerPageHeader } = usePageHeaderRegistry();

registerPageHeader({
  title: "System Settings",
  description: "Manage your system configuration, users, roles, menus, extensions, and more",
  variant: "minimal",
  gradient: "none",
});
</script>

<template>
  <div class="w-full">
    <CommonEmptyState
      title="System Settings"
      description="Manage your system configuration, users, roles, menus, extensions, and more. Select a setting category from the sidebar to get started."
      icon="lucide:settings"
      size="lg"
    />
  </div>
</template>
