<script setup lang="ts">
import { fmtMs, fmtNumber } from '~/utils/runtime-monitor/format';
import {
  metricTextClass,
} from '~/utils/runtime-monitor/core';
import {
  executorQueueSeverity,
  rotationSeverity,
  taskErrorSeverity,
  taskLatencySeverity,
  workerSeverity,
} from '~/utils/runtime-monitor/severity';
import { workerWarnings } from '~/utils/runtime-monitor/warnings';

type RuntimeMetricsViewModel = ReturnType<typeof useRuntimeMetrics>;

defineProps<{ runtime: RuntimeMetricsViewModel }>();
</script>

<template>
  <div class="grid gap-4">
    <section
      v-for="metrics in runtime.instances"
      :key="metrics.instance.id"
      class="surface-card rounded-lg p-4"
    >
      <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div class="font-medium text-[var(--text-primary)]">{{ metrics.instance.id }}</div>
        <RuntimeStatusBadge
          :severity="metrics.health?.workers?.severity ?? workerSeverity(metrics)"
          :messages="metrics.health?.workers?.messages ?? workerWarnings(metrics)"
        />
      </div>

      <div
        v-if="workerWarnings(metrics).length > 0"
        class="mb-3 rounded-lg border border-warning-400/20 bg-warning-400/5 p-3"
      >
        <div class="flex items-center gap-2 text-sm font-medium text-warning-600 dark:text-warning-400">
          <UIcon name="lucide:triangle-alert" class="h-4 w-4" />
          Worker warnings
        </div>
        <ul class="mt-2 space-y-1 text-sm text-[var(--text-secondary)]">
          <li v-for="warning in workerWarnings(metrics)" :key="warning" class="flex gap-2">
            <span class="text-warning-600 dark:text-warning-400">•</span>
            <span>{{ warning }}</span>
          </li>
        </ul>
      </div>

      <div class="mb-3 rounded-lg border border-[var(--border-default)] p-3">
        <div class="text-xs font-medium text-[var(--text-tertiary)]">Executor</div>
        <div class="mt-2 grid grid-cols-2 gap-2 text-sm">
          <div>Workers</div>
          <div class="text-right font-medium">{{ metrics.executor.pool.workers.length }} / {{ metrics.executor.pool.max }}</div>
          <div>Active now / waiting</div>
          <div class="text-right font-medium" :class="metricTextClass(executorQueueSeverity(metrics))">
            {{ metrics.executor.pool.activeTasks }} / {{ metrics.executor.pool.waitingTasks }}
          </div>
          <div>Active avg / waiting avg</div>
          <div class="text-right font-medium">
            {{ fmtNumber(metrics.averages?.executorActiveTasks ?? metrics.executor.pool.activeTasks, 1) }}
            /
            {{ fmtNumber(metrics.averages?.executorWaitingTasks ?? metrics.executor.pool.waitingTasks, 1) }}
          </div>
          <div>Task p95 / p99</div>
          <div class="text-right font-medium" :class="metricTextClass(taskLatencySeverity(metrics))">
            {{ fmtMs(metrics.executor.p95TaskMs) }} / {{ fmtMs(metrics.executor.p99TaskMs) }}
          </div>
          <div>Errors / timeouts</div>
          <div class="text-right font-medium" :class="metricTextClass(taskErrorSeverity(metrics))">
            {{ metrics.executor.taskErrorTotal }} / {{ metrics.executor.taskTimeoutTotal }}
          </div>
          <div>Rotations</div>
          <div class="text-right font-medium" :class="metricTextClass(rotationSeverity(metrics))">
            {{ metrics.executor.rotationsTotal }}
          </div>
        </div>
      </div>

      <div class="rounded-lg border border-[var(--border-default)]">
        <div class="border-b border-[var(--border-default)] px-3 py-2 text-xs font-medium text-[var(--text-tertiary)]">
          Worker Contexts
        </div>
        <div class="divide-y divide-[var(--border-default)]">
          <div
            v-for="worker in metrics.executor.pool.workers"
            :key="worker.id"
            class="grid gap-2 px-3 py-2 text-xs sm:grid-cols-6"
          >
            <div class="font-medium text-[var(--text-primary)]">#{{ worker.id }}</div>
            <div>active {{ worker.activeTasks }}</div>
            <div>idle {{ worker.contextStats.idle ?? 0 }}</div>
            <div>created {{ worker.contextStats.created ?? 0 }}</div>
            <div>reused {{ worker.contextStats.reused ?? 0 }}</div>
            <div :class="metricTextClass((worker.contextStats.scrubFailed ?? 0) > 0 ? 'error' : 'ok')">
              scrub failed {{ worker.contextStats.scrubFailed ?? 0 }}
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
