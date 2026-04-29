<script setup lang="ts">
import { fmtDateTime, fmtMs } from '~/utils/runtime-monitor/format';
import { metricTextClass } from '~/utils/runtime-monitor/core';
import { activeReloads, flowLabel } from '~/composables/shared/useAdminSocket';

type RuntimeMetricsViewModel = ReturnType<typeof useRuntimeMetrics>;

defineProps<{ runtime: RuntimeMetricsViewModel }>();

const notify = useNotify();
const { checkPermissionCondition } = usePermissions();
const { me } = useAuth();

const hasReloadPermission = computed(() => {
  if (me.value?.isRootAdmin) return true;
  return checkPermissionCondition({
    or: [
      { route: '/route_definition', actions: ['update'] },
      { route: '/admin/reload', actions: ['create'] },
    ],
  });
});

const reloadActions = [
  {
    id: 'all',
    label: 'Reload All',
    description: 'Reload metadata, routes, and GraphQL schema',
    icon: 'lucide:refresh-cw',
    path: '/admin/reload',
    color: 'primary',
  },
  {
    id: 'metadata',
    label: 'Metadata',
    description: 'Reload tables, columns, and relations',
    icon: 'lucide:database',
    path: '/admin/reload/metadata',
    color: 'secondary',
  },
  {
    id: 'routes',
    label: 'Routes',
    description: 'Reload dynamic route cache',
    icon: 'lucide:route',
    path: '/admin/reload/routes',
    color: 'secondary',
  },
  {
    id: 'graphql',
    label: 'GraphQL',
    description: 'Reload GraphQL schema',
    icon: 'lucide:code',
    path: '/admin/reload/graphql',
    color: 'neutral',
  },
] as const;

const loadingMap = ref<Record<string, boolean>>({});

async function handleReload(action: (typeof reloadActions)[number]) {
  loadingMap.value[action.id] = true;
  try {
    const { getAppUrl, normalizeUrl } = await import('~/utils/api/url');
    const apiUrl = getAppUrl();
    const basePath = action.path.replace(/^\/+/, '');
    const fullUrl = `${normalizeUrl(apiUrl, '/api')}/${basePath}`;

    const response = await $fetch(fullUrl, {
      method: 'POST',
      credentials: 'include',
    });

    notify.success(
      'Reload started',
      (response as any)?.message || `${action.label} reload accepted`,
    );
  } catch (err: any) {
    notify.error(
      'Reload failed to start',
      err?.data?.message || err?.message || 'An error occurred',
    );
  } finally {
    loadingMap.value[action.id] = false;
  }
}
</script>

<template>
  <div class="space-y-4">
    <div v-if="hasReloadPermission" class="surface-card rounded-lg p-4">
      <div class="mb-3 font-medium text-[var(--text-primary)]">Reload Cache</div>
      <div
        v-if="activeReloads.length"
        class="mb-3 rounded-md border border-primary-500/20 bg-primary-500/10 px-3 py-2 text-sm text-primary-700 dark:text-primary-300"
      >
        Reloading {{ activeReloads.map((item) => flowLabel(item.flow)).join(', ') }}
      </div>
      <div class="grid gap-3 sm:grid-cols-2">
        <div
          v-for="action in reloadActions"
          :key="action.id"
          class="flex items-start gap-3 rounded-lg border border-[var(--border-default)] bg-[var(--surface-muted)] p-3"
        >
          <div
            :class="[
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-md',
              action.color === 'primary' ? 'bg-primary-500/20 text-primary-600 dark:text-primary-400' : 'bg-[var(--surface-muted)] text-[var(--text-tertiary)]',
            ]"
          >
            <UIcon :name="action.icon" class="h-5 w-5" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="font-medium text-[var(--text-primary)]">{{ action.label }}</div>
            <div class="mt-0.5 text-xs text-[var(--text-tertiary)]">{{ action.description }}</div>
            <UButton
              :loading="loadingMap[action.id]"
              :disabled="loadingMap[action.id]"
              size="sm"
              :color="action.color as any"
              variant="soft"
              class="mt-2"
              :icon="loadingMap[action.id] ? undefined : 'lucide:play'"
              @click="handleReload(action)"
            >
              {{ loadingMap[action.id] ? 'Starting...' : 'Reload' }}
            </UButton>
          </div>
        </div>
      </div>
    </div>

    <div class="surface-card rounded-lg p-4">
      <div class="mb-3 font-medium text-[var(--text-primary)]">Cache Reload Health</div>
      <div class="grid gap-3">
        <div
          v-for="row in runtime.cacheReloadRows"
          :key="`${row.instanceId}:${row.completedAt}:${row.flow}`"
          class="rounded-lg border border-[var(--border-default)] p-3"
        >
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div class="font-medium text-[var(--text-primary)]">{{ row.flow }} · {{ row.table }}</div>
              <div class="mt-1 text-xs text-[var(--text-tertiary)]">
                {{ row.instanceId }} · {{ fmtDateTime(row.completedAt) }}
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium">{{ fmtMs(row.durationMs) }}</span>
              <UBadge :color="row.status === 'failed' ? 'error' : 'success'" variant="soft">
                {{ row.status }}
              </UBadge>
            </div>
          </div>

          <div class="mt-3 grid gap-2 sm:grid-cols-2">
            <div
              v-for="step in row.steps"
              :key="`${row.completedAt}:${step.name}`"
              class="flex items-center justify-between gap-3 rounded-md border border-[var(--border-default)] px-2 py-1 text-xs"
            >
              <span class="truncate" :class="metricTextClass(step.status === 'failed' ? 'error' : 'ok')">
                {{ step.name }}
              </span>
              <span>{{ fmtMs(step.durationMs) }}</span>
            </div>
          </div>

          <div v-if="row.error" class="mt-2 text-xs text-error-600 dark:text-error-400">
            {{ row.error }}
          </div>
        </div>

        <div v-if="runtime.cacheReloadRows.length === 0" class="py-8 text-center text-sm text-[var(--text-tertiary)]">
          No cache reloads recorded yet
        </div>
      </div>
    </div>
  </div>
</template>
