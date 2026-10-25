<script setup lang="ts">
import { sortMenuItems } from "~/utils/menu-order";

const { registerPageHeader } = usePageHeaderRegistry();
const { menuItems } = useMenuRegistry();
const { hasMenuPermission } = usePermissions();

registerPageHeader({
  title: "System Settings",
  description: "Manage your system configuration, users, roles, menus, extensions, and more",
  variant: "minimal",
  gradient: "none",
});

const settingsLinks = computed(() =>
  sortMenuItems(
    menuItems.value.filter((item) => {
      const path = item.path || item.route;
      return (
        item.isEnabled === true &&
        !item.component &&
        typeof path === "string" &&
        path.startsWith("/settings/") &&
        !/[:*?#\[\]\\\s]/.test(path) &&
        hasMenuPermission(item)
      );
    }),
  ),
);
</script>

<template>
  <div class="w-full min-w-0 eapp-page-constrained space-y-6">
    <div v-if="settingsLinks.length > 0" class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      <NuxtLink
        v-for="item in settingsLinks"
        :key="item.id"
        :to="item.path || item.route"
        class="eapp-bordered-region flex min-w-0 items-start gap-3 p-4 transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <UIcon :name="item.icon || 'lucide:settings'" class="eapp-accent-text mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <div class="min-w-0 flex-1">
          <p class="font-medium text-default break-words">{{ item.label }}</p>
          <p v-if="item.description" class="mt-1 line-clamp-2 text-sm leading-5 text-muted break-words">{{ item.description }}</p>
        </div>
        <UIcon name="lucide:chevron-right" class="mt-0.5 size-4 shrink-0 text-muted" aria-hidden="true" />
      </NuxtLink>
    </div>

    <CommonEmptyState
      v-else
      title="No settings available"
      description="Select a setting category from the sidebar to get started."
      icon="lucide:settings"
      size="lg"
    />
  </div>
</template>
