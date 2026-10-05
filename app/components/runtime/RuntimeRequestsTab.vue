<script setup lang="ts">
import { h } from 'vue';
import type { ColumnDef } from '@tanstack/vue-table';
import { fmtMs, fmtNumber } from '~/utils/runtime-monitor/format';
import { metricTextClass } from '~/utils/runtime-monitor/core';
import { MethodBadge } from '#components';

type RuntimeMetricsViewModel = ReturnType<typeof useRuntimeMetrics>;
type RequestRow = RuntimeMetricsViewModel['requestRows'][number];

const props = defineProps<{ runtime: RuntimeMetricsViewModel }>();
const columns: ColumnDef<RequestRow>[] = [
  { id: 'route', header: 'Route', cell: ({ row }) => h('div', { class: 'flex min-w-0 items-center gap-2' }, [h(MethodBadge, { method: row.original.method }), h('span', { class: 'truncate text-[var(--text-tertiary)]' }, row.original.route)]) },
  { id: 'rps', header: 'RPS', meta: { class: { th: 'text-right', td: 'text-right font-medium' } }, cell: ({ row }) => fmtNumber(row.original.rps, 2) },
  { id: 'p50', header: 'p50', meta: { class: { th: 'text-right', td: 'text-right' } }, cell: ({ row }) => fmtMs(row.original.p50Ms) },
  { id: 'p95', header: 'p95', meta: { class: { th: 'text-right', td: 'text-right' } }, cell: ({ row }) => h('span', { class: metricTextClass(row.original.p95Ms >= 1000 ? 'warning' : 'ok') }, fmtMs(row.original.p95Ms)) },
  { id: 'p99', header: 'p99', meta: { class: { th: 'text-right', td: 'text-right' } }, cell: ({ row }) => h('span', { class: metricTextClass(row.original.p99Ms >= 5000 ? 'error' : row.original.p99Ms >= 1000 ? 'warning' : 'ok') }, fmtMs(row.original.p99Ms)) },
  { id: 'status4xx', header: '4xx', meta: { class: { th: 'text-right', td: 'text-right' } }, cell: ({ row }) => h('span', { class: metricTextClass(row.original.status4xx > 0 ? 'warning' : 'ok') }, String(row.original.status4xx)) },
  { id: 'status5xx', header: '5xx', meta: { class: { th: 'text-right', td: 'text-right' } }, cell: ({ row }) => h('span', { class: metricTextClass(row.original.status5xx > 0 ? 'error' : 'ok') }, String(row.original.status5xx)) },
];
</script>

<template>
  <DataTable :data="props.runtime.requestRows" :columns="columns">
    <template #toolbar><h2 class="text-sm font-medium text-[var(--text-primary)]">Request/API Metrics</h2></template>
    <template #empty><CommonEmptyState variant="naked" title="No request metrics yet" icon="lucide:activity" size="sm" /></template>
  </DataTable>
</template>
