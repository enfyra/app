<script setup lang="ts">
import { h } from 'vue';
import type { ColumnDef } from '@tanstack/vue-table';
import { fmtMs } from '~/utils/runtime-monitor/format';
import { metricTextClass } from '~/utils/runtime-monitor/core';
import { databaseSeverity } from '~/utils/runtime-monitor/severity';
import { databaseWarnings } from '~/utils/runtime-monitor/warnings';

type RuntimeMetricsViewModel = ReturnType<typeof useRuntimeMetrics>;

type DatabaseRow = RuntimeMetricsViewModel['databaseRows'][number];
const props = defineProps<{ runtime: RuntimeMetricsViewModel }>();
const columns: ColumnDef<DatabaseRow>[] = [
  { id: 'context', header: 'Context', cell: ({ row }) => row.original.context },
  { id: 'operation', header: 'Operation', cell: ({ row }) => h('div', { class: 'min-w-0' }, [h('span', { class: 'font-medium' }, row.original.op), h('span', { class: 'ml-2 text-[var(--text-tertiary)]' }, row.original.table)]) },
  { id: 'count', header: 'Count', meta: { class: { th: 'text-right', td: 'text-right' } }, cell: ({ row }) => String(row.original.count) },
  { id: 'slow', header: 'Slow', meta: { class: { th: 'text-right', td: 'text-right' } }, cell: ({ row }) => h('span', { class: metricTextClass(row.original.slow > 0 ? 'warning' : 'ok') }, String(row.original.slow)) },
  { id: 'errors', header: 'Errors', meta: { class: { th: 'text-right', td: 'text-right' } }, cell: ({ row }) => h('span', { class: metricTextClass(row.original.errors > 0 ? 'error' : 'ok') }, String(row.original.errors)) },
  { id: 'pool', header: 'Pool timeout', meta: { class: { th: 'text-right', td: 'text-right' } }, cell: ({ row }) => h('span', { class: metricTextClass(row.original.poolAcquireTimeouts > 0 ? 'error' : 'ok') }, String(row.original.poolAcquireTimeouts)) },
  { id: 'p95', header: 'p95', meta: { class: { th: 'text-right', td: 'text-right' } }, cell: ({ row }) => fmtMs(row.original.p95Ms) },
  { id: 'p99', header: 'p99', meta: { class: { th: 'text-right', td: 'text-right' } }, cell: ({ row }) => fmtMs(row.original.p99Ms) },
];
</script>

<template>
  <div class="surface-card rounded-lg p-4">
    <div class="mb-3 font-medium text-[var(--text-primary)]">Query/DB Slow Path</div>
    <div class="mb-4 grid gap-3">
      <div
        v-for="metrics in runtime.instances"
        :key="`db-${metrics.instance.id}`"
        class="rounded-lg border border-[var(--border-default)] p-3"
      >
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="font-medium text-[var(--text-primary)]">{{ metrics.instance.id }}</div>
          <RuntimeStatusBadge
            :severity="metrics.health?.database?.severity ?? databaseSeverity(metrics)"
            :messages="metrics.health?.database?.messages ?? databaseWarnings(metrics)"
          />
        </div>

        <div
          v-if="databaseWarnings(metrics).length > 0"
          class="eapp-status-warning-soft mt-3 rounded-lg p-3"
        >
          <div class="flex items-center gap-2 text-sm font-medium">
            <UIcon name="lucide:triangle-alert" class="h-4 w-4" />
            Database warnings
          </div>
          <ul class="mt-2 space-y-1 text-sm text-[var(--text-secondary)]">
            <li v-for="warning in databaseWarnings(metrics)" :key="warning" class="flex gap-2">
              <span class="eapp-status-warning-text">•</span>
              <span>{{ warning }}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <DataTable :data="props.runtime.databaseRows" :columns="columns">
      <template #toolbar><h2 class="text-sm font-medium">Query metrics</h2></template>
      <template #empty><CommonEmptyState variant="naked" title="No query metrics yet" icon="lucide:database" size="sm" /></template>
    </DataTable>
  </div>
</template>
