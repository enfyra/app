<script setup lang="ts">
import { h } from 'vue';
import type { ColumnDef } from '@tanstack/vue-table';
import { UButton } from '#components';
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

const props = defineProps<{ runtime: RuntimeMetricsViewModel }>();
const flowColumns: ColumnDef<RuntimeFlowRow>[] = [
  { id: 'flow', header: 'Flow', cell: ({ row }) => row.original.flowName },
  { id: 'running', header: 'Running', meta: { class: { th: 'text-right', td: 'text-right' } }, cell: ({ row }) => String(row.original.running) },
  { id: 'completed', header: 'Completed', meta: { class: { th: 'text-right', td: 'text-right' } }, cell: ({ row }) => String(row.original.completed) },
  { id: 'failed', header: 'Failed', meta: { class: { th: 'text-right', td: 'text-right' } }, cell: ({ row }) => h('span', { class: metricTextClass(row.original.failed > 0 ? 'error' : 'ok') }, String(row.original.failed)) },
  { id: 'p95', header: 'p95', meta: { class: { th: 'text-right', td: 'text-right' } }, cell: ({ row }) => fmtMs(row.original.p95Ms) },
  { id: 'failedSteps', header: 'Failed steps', cell: ({ row }) => h('span', { class: 'text-xs text-[var(--text-tertiary)]' }, failedStepLabels(row.original)) },
  { id: 'slowSteps', header: 'Slow steps', cell: ({ row }) => h('span', { class: 'text-xs text-[var(--text-tertiary)]' }, slowStepLabels(row.original)) },
];
const failedJobColumns: ColumnDef<RuntimeFlowFailedJobRow>[] = [
  { id: 'target', header: 'Debug target', cell: ({ row }) => {
    const to = flowDebugTo(row.original);
    return h('div', { class: 'flex min-w-0 items-center gap-2' }, [
      to ? h(UButton, { to, icon: 'lucide:external-link', size: 'xs', variant: 'soft', color: 'primary' }) : null,
      h('div', { class: 'min-w-0' }, [
        h('div', { class: 'truncate font-medium', title: debugTarget(row.original) }, debugTarget(row.original)),
        h('div', { class: 'truncate text-xs text-[var(--text-tertiary)]', title: row.original.name || '-' }, shortText(row.original.name || '-', 28, 8)),
      ]),
    ]);
  } },
  { id: 'source', header: 'Triggered by', cell: ({ row }) => h('div', { class: 'min-w-0' }, [h('div', { class: 'truncate font-medium', title: flowSourceLabel(row.original) }, flowSourceLabel(row.original)), h('div', { class: 'truncate text-xs text-[var(--text-tertiary)]' }, row.original.sourceStepKey ? `step ${row.original.sourceStepKey}` : `job #${shortText(row.original.id, 10, 4)}`)]) },
  { id: 'reason', header: 'Reason', cell: ({ row }) => h('span', { class: 'block max-w-[360px] truncate text-xs text-[var(--text-tertiary)]', title: row.original.failedReason || '-' }, row.original.failedReason || '-') },
  { id: 'attempts', header: 'Attempts', meta: { class: { th: 'text-right', td: 'text-right' } }, cell: ({ row }) => String(row.original.attemptsMade) },
  { id: 'failedAt', header: 'Failed at', cell: ({ row }) => h('span', { class: 'text-xs text-[var(--text-tertiary)]' }, fmtDateTime(row.original.finishedOn ? new Date(row.original.finishedOn) : row.original.timestamp ? new Date(row.original.timestamp) : null)) },
];

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
  <div class="space-y-4">
    <section class="surface-card rounded-lg p-4">
    <div class="mb-3 font-medium text-[var(--text-primary)]">Flow Execution Health</div>
    <div class="grid gap-3">
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
          class="eapp-status-warning-soft mt-3 rounded-lg p-3"
        >
          <div class="flex items-center gap-2 text-sm font-medium">
            <UIcon name="lucide:triangle-alert" class="h-4 w-4" />
            Flow warnings
          </div>
          <ul class="mt-2 space-y-1 text-sm text-[var(--text-secondary)]">
            <li v-for="warning in flowWarnings(metrics)" :key="warning" class="flex gap-2">
              <span class="eapp-status-warning-text">•</span>
              <span>{{ warning }}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
    </section>

    <DataTable :data="props.runtime.flowRows" :columns="flowColumns">
      <template #toolbar><h3 class="text-sm font-medium">Flow executions</h3></template>
      <template #empty><CommonEmptyState variant="naked" title="No flow executions recorded yet" icon="lucide:workflow" size="sm" /></template>
    </DataTable>
    <DataTable :data="props.runtime.flowFailedJobRows" :columns="failedJobColumns">
      <template #toolbar><h3 class="text-sm font-medium">Failed queue jobs</h3></template>
      <template #empty><CommonEmptyState variant="naked" title="No retained failed queue jobs" icon="lucide:circle-alert" size="sm" /></template>
    </DataTable>
  </div>
</template>
