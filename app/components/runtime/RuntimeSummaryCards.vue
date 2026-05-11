<script setup lang="ts">
import {
  fmtDateTime,
  fmtMb,
  fmtMs,
} from '~/utils/runtime-monitor/format';
import {
  badgeColor,
  metricTextClass,
} from '~/utils/runtime-monitor/core';

type RuntimeMetricsViewModel = ReturnType<typeof useRuntimeMetrics>;

defineProps<{ runtime: RuntimeMetricsViewModel }>();
</script>

<template>
  <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
    <div class="surface-card rounded-lg p-4">
      <div class="text-xs font-medium text-[var(--text-tertiary)]">Instances</div>
      <div class="mt-2 text-2xl font-semibold" :class="metricTextClass(runtime.clusterSeverity())">
        {{ runtime.appClusterStats.activeCount }}
      </div>
      <div class="mt-1 text-xs text-[var(--text-tertiary)]">
        app active
      </div>
    </div>

    <div class="surface-card rounded-lg p-4">
      <div class="text-xs font-medium text-[var(--text-tertiary)]">RSS</div>
      <div class="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
        {{ fmtMb(runtime.totals.rssMb) }}
      </div>
      <div class="mt-1 text-xs text-[var(--text-tertiary)]">
        avg {{ fmtMb(runtime.totals.avgRssMb) }}
      </div>
    </div>

    <div class="surface-card rounded-lg p-4">
      <div class="text-xs font-medium text-[var(--text-tertiary)]">Heap</div>
      <div
        class="mt-2 text-2xl font-semibold"
        :class="metricTextClass(runtime.totals.heapLimitMb > 0 && runtime.totals.heapUsedMb / runtime.totals.heapLimitMb >= 0.9 ? 'error' : runtime.totals.heapLimitMb > 0 && runtime.totals.heapUsedMb / runtime.totals.heapLimitMb >= 0.75 ? 'warning' : 'ok')"
      >
        {{ fmtMb(runtime.totals.heapUsedMb) }}
      </div>
      <div class="mt-1 text-xs text-[var(--text-tertiary)]">
        avg {{ fmtMb(runtime.totals.avgHeapUsedMb) }}
      </div>
    </div>

    <div class="surface-card rounded-lg p-4">
      <div class="text-xs font-medium text-[var(--text-tertiary)]">Event Loop</div>
      <div
        class="mt-2 text-2xl font-semibold"
        :class="metricTextClass(runtime.totals.maxEventLoopLagMs >= 200 ? 'error' : runtime.totals.maxEventLoopLagMs >= 50 ? 'warning' : 'ok')"
      >
        {{ fmtMs(runtime.totals.maxEventLoopLagMs) }}
      </div>
      <div class="mt-1 text-xs text-[var(--text-tertiary)]">
        avg {{ fmtMs(runtime.totals.avgEventLoopLagMs / Math.max(runtime.instances.length, 1)) }}
      </div>
    </div>

    <div class="surface-card rounded-lg p-4">
      <div class="flex items-center justify-between gap-2">
        <div class="text-xs font-medium text-[var(--text-tertiary)]">Updated</div>
        <UBadge :color="badgeColor(runtime.updatedSeverity())" variant="soft" size="xs">
          {{ runtime.updatedSeverity() === 'ok' ? 'Live' : 'Stale' }}
        </UBadge>
      </div>
      <div class="mt-2 text-2xl font-semibold" :class="metricTextClass(runtime.updatedSeverity())">
        {{ runtime.lastUpdatedLabel }}
      </div>
      <div class="mt-1 truncate text-xs text-[var(--text-tertiary)]">
        {{ fmtDateTime(runtime.latestSampledAt) }}
      </div>
      <div class="mt-2">
        <div class="mb-1 flex items-center justify-between gap-2 text-xs text-[var(--text-tertiary)]">
          <span>Next sample</span>
          <span class="font-medium text-[var(--text-secondary)]">{{ runtime.nextUpdateLabel }}</span>
        </div>
        <div class="h-1.5 overflow-hidden rounded-full bg-[var(--surface-muted)]">
          <div
            class="h-full rounded-full bg-primary-500 transition-[width] duration-200"
            :style="{ width: `${runtime.nextUpdateProgress * 100}%` }"
          />
        </div>
      </div>
    </div>
  </div>
</template>
