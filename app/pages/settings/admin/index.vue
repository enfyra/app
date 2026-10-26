<script setup lang="ts">
const { checkPermissionCondition } = usePermissions();
const { me } = useAuth();

const adminTools = computed(() => {
  const isRootAdmin = !!me.value?.isRootAdmin;
  const canReadLogs = isRootAdmin || checkPermissionCondition({
    or: [{ route: '/enfyra_system_error', methods: ['GET'] }, { route: '/enfyra_user_log', methods: ['GET'] }],
  });

  return [
    {
      title: 'Server Logs',
      description: 'Trace system errors and user script logs by correlation ID.',
      icon: 'lucide:file-search',
      to: '/settings/logs',
      visible: canReadLogs,
    },
    {
      title: 'Audit',
      description: 'Review code revisions and restore an earlier revision as a new version.',
      icon: 'lucide:history',
      to: '/settings/audit',
      visible: isRootAdmin || checkPermissionCondition({ and: [{ route: '/enfyra_audit', methods: ['GET'] }] }),
    },
    {
      title: 'Runtime Monitor',
      description: 'Watch process, executor, queue, websocket, and DB pool health.',
      icon: 'lucide:activity',
      to: '/settings/runtime',
      visible: isRootAdmin,
    },
  ].filter((tool) => tool.visible);
});

const adminSections = [
  {
    value: 'admin',
    title: 'Admin',
    description: 'Operational tools for logs and runtime health',
  },
];
</script>

<template>
  <div class="eapp-page-constrained space-y-6 lg:px-0">
    <CommonPanel :sections="adminSections">
      <template #admin>
    <div v-if="adminTools.length > 0" class="grid gap-3 sm:grid-cols-2">
      <NuxtLink
        v-for="tool in adminTools"
        :key="tool.to"
        :to="tool.to"
        class="eapp-bordered-region group p-4 transition-colors hover:border-[var(--border-strong)]"
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
      </template>
    </CommonPanel>
  </div>
</template>
