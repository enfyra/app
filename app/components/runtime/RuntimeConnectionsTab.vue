<script setup lang="ts">
import {
  connectionQueueEntries,
  dbPoolRows,
  metricTextClass,
  queueTotal,
  websocketRows,
} from '~/utils/runtime-monitor/core';
import {
  connectionSeverity,
  queueSeverity,
} from '~/utils/runtime-monitor/severity';
import { connectionWarnings } from '~/utils/runtime-monitor/warnings';

type RuntimeMetricsViewModel = ReturnType<typeof useRuntimeMetrics>;

defineProps<{ runtime: RuntimeMetricsViewModel }>();
</script>

<template>
  <CommonAnimatedGrid grid-class="grid gap-4">
    <section
      v-for="metrics in runtime.instances"
      :key="metrics.instance.id"
      class="surface-card rounded-lg p-4"
    >
      <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div class="font-medium text-[var(--text-primary)]">{{ metrics.instance.id }}</div>
        <RuntimeStatusBadge
          :severity="metrics.health?.connections?.severity ?? connectionSeverity(metrics)"
          :messages="metrics.health?.connections?.messages ?? connectionWarnings(metrics)"
        />
      </div>

      <div
        v-if="connectionWarnings(metrics).length > 0"
        class="mb-3 rounded-lg border border-warning-400/20 bg-warning-400/5 p-3"
      >
        <div class="flex items-center gap-2 text-sm font-medium text-warning-600 dark:text-warning-400">
          <UIcon name="lucide:triangle-alert" class="h-4 w-4" />
          Connection warnings
        </div>
        <ul class="mt-2 space-y-1 text-sm text-[var(--text-secondary)]">
          <li v-for="warning in connectionWarnings(metrics)" :key="warning" class="flex gap-2">
            <span class="text-warning-600 dark:text-warning-400">•</span>
            <span>{{ warning }}</span>
          </li>
        </ul>
      </div>

      <div class="grid gap-3 sm:grid-cols-2">
        <div class="rounded-lg border border-[var(--border-default)] p-3">
          <div class="text-xs font-medium text-[var(--text-tertiary)]">WebSocket</div>
          <div class="mt-2 space-y-2 text-sm">
            <div v-for="row in websocketRows(metrics)" :key="row.path" class="flex items-center justify-between gap-3">
              <span class="truncate">{{ row.path }}</span>
              <span class="font-medium">{{ row.connected }} connected · {{ row.users }} users</span>
            </div>
            <div v-if="websocketRows(metrics).length === 0" class="text-[var(--text-tertiary)]">
              No namespaces
            </div>
          </div>
        </div>

        <div class="rounded-lg border border-[var(--border-default)] p-3">
          <div class="text-xs font-medium text-[var(--text-tertiary)]">Queues</div>
          <div class="mt-2 space-y-2 text-sm">
            <div
              v-for="[name, queue] in connectionQueueEntries(metrics)"
              :key="name"
              class="flex items-center justify-between gap-3"
            >
              <span class="truncate">{{ name }}</span>
              <span class="font-medium" :class="metricTextClass(queueSeverity(queue))">
                {{ queueTotal(queue) }}
              </span>
            </div>
          </div>
        </div>

        <div class="rounded-lg border border-[var(--border-default)] p-3 sm:col-span-2">
          <div class="text-xs font-medium text-[var(--text-tertiary)]">DB Pool</div>
          <div class="mt-2 space-y-2 text-sm">
            <div v-for="row in dbPoolRows(metrics)" :key="row.name" class="flex items-center justify-between gap-3">
              <span class="truncate">{{ row.name }}</span>
              <span
                class="font-medium"
                :class="metricTextClass((row.pending ?? 0) >= 100 ? 'error' : (row.pending ?? 0) > 0 ? 'warning' : 'ok')"
              >
                {{ row.used ?? 0 }} used · {{ row.available ?? 0 }} available ·
                {{ row.idle ?? 0 }} idle · {{ row.pending ?? 0 }} pending
                <span v-if="row.max != null"> · {{ row.max }} max</span>
              </span>
            </div>
            <div v-if="dbPoolRows(metrics).length === 0" class="text-[var(--text-tertiary)]">
              {{ metrics.db?.type ?? 'unknown' }}
            </div>
          </div>
        </div>
      </div>
    </section>
  </CommonAnimatedGrid>
</template>
