<script setup lang="ts">
const { registerPageHeader } = usePageHeaderRegistry();
const { checkPermissionCondition } = usePermissions();
const { me } = useAuth();

registerPageHeader({
  title: 'Admin',
  description: 'Operational tools for cache, logs, and runtime health',
  variant: 'default',
  gradient: 'blue',
});

const adminTools = computed(() => {
  const isRootAdmin = !!me.value?.isRootAdmin;
  const canReload = isRootAdmin || checkPermissionCondition({
    or: [
      { route: '/route_definition', actions: ['update'] },
      { route: '/admin/reload', actions: ['create'] },
    ],
  });
  const canReadLogs = isRootAdmin || checkPermissionCondition({
    or: [{ route: '/logs', actions: ['read'] }],
  });

  return [
    {
      title: 'Cache Reload',
      description: 'Reload metadata, routes, GraphQL, and related runtime caches.',
      icon: 'lucide:refresh-cw',
      to: '/settings/admin/cache',
      visible: canReload,
    },
    {
      title: 'Server Logs',
      description: 'Inspect backend log files and search recent server events.',
      icon: 'lucide:file-search',
      to: '/settings/admin/logs',
      visible: canReadLogs,
    },
    {
      title: 'Runtime Monitor',
      description: 'Watch process, executor, queue, websocket, and DB pool health.',
      icon: 'lucide:activity',
      to: '/settings/admin/runtime',
      visible: isRootAdmin,
    },
  ].filter((tool) => tool.visible);
});
</script>

<template>
  <div class="max-w-[1000px] space-y-6 lg:px-0">
    <div v-if="adminTools.length > 0" class="grid gap-3 sm:grid-cols-2">
      <NuxtLink
        v-for="tool in adminTools"
        :key="tool.to"
        :to="tool.to"
        class="surface-card group rounded-lg p-4 transition-colors hover:border-[var(--border-strong)]"
      >
        <div class="flex items-start gap-3">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-500/10 text-primary-600 dark:text-primary-400">
            <UIcon :name="tool.icon" class="h-5 w-5" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="font-medium text-[var(--text-primary)]">{{ tool.title }}</div>
            <div class="mt-1 text-sm text-[var(--text-tertiary)]">{{ tool.description }}</div>
          </div>
          <UIcon name="lucide:chevron-right" class="mt-1 h-4 w-4 text-[var(--text-tertiary)] transition-transform group-hover:translate-x-0.5" />
        </div>
      </NuxtLink>
    </div>

    <CommonEmptyState
      v-else
      title="Access denied"
      description="You do not have permission to view admin tools."
      icon="lucide:lock"
      size="md"
    />
  </div>
</template>
