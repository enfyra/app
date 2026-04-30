<script setup lang="ts">
import { fmtDateTime, fmtMs } from '~/utils/runtime-monitor/format';
import {
  metricTextClass,
  queueTotal,
  shortText,
} from '~/utils/runtime-monitor/core';
import { flowSeverity } from '~/utils/runtime-monitor/severity';
import { flowWarnings } from '~/utils/runtime-monitor/warnings';
import type { RuntimeFlowFailedJobRow, RuntimeFlowRow } from '~/types/runtime-monitor';

type RuntimeMetricsViewModel = ReturnType<typeof useRuntimeMetrics>;

defineProps<{ runtime: RuntimeMetricsViewModel }>();

function flowDebugTo(job: RuntimeFlowFailedJobRow) {
  const flowId = job.failedStepKey ? job.flowId : (job.sourceFlowId ?? job.flowId);
  const stepKey = job.failedStepKey ?? job.sourceStepKey;
  if (!flowId) return undefined;
  return {
    path: `/settings/flows/${flowId}`,
    query: stepKey ? { editStepKey: stepKey } : undefined,
  };
}

function debugTarget(job: RuntimeFlowFailedJobRow) {
  if (job.failedStepKey) return `${job.flowName || job.flowId || '-'} / ${job.failedStepKey}`;
  if (job.sourceStepKey) return `${job.sourceFlowName || job.sourceFlowId || '-'} / ${job.sourceStepKey}`;
  return String(job.flowName || job.flowId || '-');
}

function flowSourceLabel(job: RuntimeFlowFailedJobRow) {
  return String(job.sourceFlowName || job.sourceFlowId || '-');
}

function failedStepLabels(row: RuntimeFlowRow) {
  return row.failedSteps.map((step) => `${step.step} (${step.count})`).join(', ') || '-';
}

function slowStepLabels(row: RuntimeFlowRow) {
  return row.slowSteps.map((step) => `${step.step} ${fmtMs(step.p95Ms)}`).join(', ') || '-';
}
</script>

<template>
  <div class="surface-card rounded-lg p-4">
    <div class="mb-3 font-medium text-[var(--text-primary)]">Flow Execution Health</div>
    <div class="mb-4 grid gap-3">
      <div
        v-for="metrics in runtime.instances"
        :key="`flow-${metrics.instance.id}`"
        class="rounded-lg border border-[var(--border-default)] p-3"
      >
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div class="font-medium text-[var(--text-primary)]">{{ metrics.instance.id }}</div>
            <div class="mt-1 text-xs text-[var(--text-tertiary)]">
              queue {{ queueTotal(metrics.queues.flow) }} · active {{ metrics.queues.flow?.active ?? 0 }} · failed {{ metrics.queues.flow?.failed ?? 0 }}
            </div>
          </div>
          <RuntimeStatusBadge
            :severity="metrics.health?.flows?.severity ?? flowSeverity(metrics)"
            :messages="metrics.health?.flows?.messages ?? flowWarnings(metrics)"
          />
        </div>

        <div
          v-if="flowWarnings(metrics).length > 0"
          class="mt-3 rounded-lg border border-warning-400/20 bg-warning-400/5 p-3"
        >
          <div class="flex items-center gap-2 text-sm font-medium text-warning-600 dark:text-warning-400">
            <UIcon name="lucide:triangle-alert" class="h-4 w-4" />
            Flow warnings
          </div>
          <ul class="mt-2 space-y-1 text-sm text-[var(--text-secondary)]">
            <li v-for="warning in flowWarnings(metrics)" :key="warning" class="flex gap-2">
              <span class="text-warning-600 dark:text-warning-400">•</span>
              <span>{{ warning }}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <div class="overflow-x-auto rounded-lg border border-[var(--border-default)]">
      <table class="w-full min-w-[780px] text-sm">
        <thead class="border-b border-[var(--border-default)] text-left text-xs text-[var(--text-tertiary)]">
          <tr>
            <th class="px-3 py-2">Flow</th>
            <th class="px-3 py-2 text-right">Running</th>
            <th class="px-3 py-2 text-right">Completed</th>
            <th class="px-3 py-2 text-right">Failed</th>
            <th class="px-3 py-2 text-right">p95</th>
            <th class="px-3 py-2">Failed steps</th>
            <th class="px-3 py-2">Slow steps</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-[var(--border-default)]">
          <tr v-for="row in runtime.flowRows" :key="row.flowId">
            <td class="px-3 py-2 font-medium">{{ row.flowName }}</td>
            <td class="px-3 py-2 text-right">{{ row.running }}</td>
            <td class="px-3 py-2 text-right">{{ row.completed }}</td>
            <td class="px-3 py-2 text-right" :class="metricTextClass(row.failed > 0 ? 'error' : 'ok')">
              {{ row.failed }}
            </td>
            <td class="px-3 py-2 text-right">{{ fmtMs(row.p95Ms) }}</td>
            <td class="px-3 py-2 text-xs text-[var(--text-tertiary)]">
              {{ failedStepLabels(row) }}
            </td>
            <td class="px-3 py-2 text-xs text-[var(--text-tertiary)]">
              {{ slowStepLabels(row) }}
            </td>
          </tr>
          <tr v-if="runtime.flowRows.length === 0">
            <td colspan="7" class="px-3 py-8 text-center text-[var(--text-tertiary)]">
              No flow executions recorded yet
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="mt-4 overflow-x-auto rounded-lg border border-[var(--border-default)]">
      <table class="w-full min-w-[860px] text-sm">
        <thead class="border-b border-[var(--border-default)] text-left text-xs text-[var(--text-tertiary)]">
          <tr>
            <th class="px-3 py-2">Debug target</th>
            <th class="px-3 py-2">Triggered by</th>
            <th class="px-3 py-2">Reason</th>
            <th class="px-3 py-2 text-right">Attempts</th>
            <th class="px-3 py-2">Failed at</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-[var(--border-default)]">
          <tr v-for="job in runtime.flowFailedJobRows" :key="`${job.instanceId}-${job.id}`">
            <td class="px-3 py-2">
              <div class="flex min-w-0 items-center gap-2">
                <UButton
                  v-if="flowDebugTo(job)"
                  :to="flowDebugTo(job)"
                  icon="lucide:external-link"
                  size="xs"
                  variant="soft"
                  color="primary"
                />
                <div class="min-w-0">
                  <div class="truncate font-medium text-[var(--text-primary)]" :title="debugTarget(job)">
                    {{ debugTarget(job) }}
                  </div>
                  <div class="truncate text-xs text-[var(--text-tertiary)]" :title="job.name || '-'">
                    {{ shortText(job.name || '-', 28, 8) }}
                  </div>
                </div>
              </div>
            </td>
            <td class="px-3 py-2">
              <div class="truncate font-medium text-[var(--text-primary)]" :title="flowSourceLabel(job)">
                {{ flowSourceLabel(job) }}
              </div>
              <div class="truncate text-xs text-[var(--text-tertiary)]" :title="job.sourceStepKey || ''">
                {{ job.sourceStepKey ? `step ${job.sourceStepKey}` : `job #${shortText(job.id, 10, 4)}` }}
              </div>
            </td>
            <td class="max-w-[360px] truncate px-3 py-2 text-xs text-[var(--text-tertiary)]" :title="job.failedReason || '-'">
              {{ job.failedReason || '-' }}
            </td>
            <td class="px-3 py-2 text-right">{{ job.attemptsMade }}</td>
            <td class="px-3 py-2 text-xs text-[var(--text-tertiary)]">
              {{ fmtDateTime(job.finishedOn ? new Date(job.finishedOn) : job.timestamp ? new Date(job.timestamp) : null) }}
            </td>
          </tr>
          <tr v-if="runtime.flowFailedJobRows.length === 0">
            <td colspan="5" class="px-3 py-8 text-center text-[var(--text-tertiary)]">
              No retained failed queue jobs
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
