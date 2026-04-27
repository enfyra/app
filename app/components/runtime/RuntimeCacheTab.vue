<script setup lang="ts">
import { fmtDateTime, fmtMs } from '~/utils/runtime-monitor/format';
import { metricTextClass } from '~/utils/runtime-monitor/core';

type RuntimeMetricsViewModel = ReturnType<typeof useRuntimeMetrics>;

defineProps<{ runtime: RuntimeMetricsViewModel }>();
</script>

<template>
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
</template>
