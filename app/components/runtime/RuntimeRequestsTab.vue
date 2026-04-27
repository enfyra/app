<script setup lang="ts">
import { fmtMs, fmtNumber } from '~/utils/runtime-monitor/format';
import {
  methodColor,
  metricTextClass,
} from '~/utils/runtime-monitor/core';

type RuntimeMetricsViewModel = ReturnType<typeof useRuntimeMetrics>;

defineProps<{ runtime: RuntimeMetricsViewModel }>();
</script>

<template>
  <div class="surface-card rounded-lg p-4">
    <div class="mb-3 font-medium text-[var(--text-primary)]">Request/API Metrics</div>
    <div class="overflow-x-auto rounded-lg border border-[var(--border-default)]">
      <table class="w-full min-w-[760px] text-sm">
        <thead class="border-b border-[var(--border-default)] text-left text-xs text-[var(--text-tertiary)]">
          <tr>
            <th class="px-3 py-2">Route</th>
            <th class="px-3 py-2 text-right">RPS</th>
            <th class="px-3 py-2 text-right">p50</th>
            <th class="px-3 py-2 text-right">p95</th>
            <th class="px-3 py-2 text-right">p99</th>
            <th class="px-3 py-2 text-right">4xx</th>
            <th class="px-3 py-2 text-right">5xx</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-[var(--border-default)]">
          <tr v-for="row in runtime.requestRows" :key="`${row.method}:${row.route}`">
            <td class="px-3 py-2">
              <UBadge :color="methodColor(row.method)" variant="soft" size="xs">
                {{ row.method }}
              </UBadge>
              <span class="ml-2 text-[var(--text-tertiary)]">{{ row.route }}</span>
            </td>
            <td class="px-3 py-2 text-right font-medium">{{ fmtNumber(row.rps, 2) }}</td>
            <td class="px-3 py-2 text-right">{{ fmtMs(row.p50Ms) }}</td>
            <td class="px-3 py-2 text-right" :class="metricTextClass(row.p95Ms >= 1000 ? 'warning' : 'ok')">
              {{ fmtMs(row.p95Ms) }}
            </td>
            <td class="px-3 py-2 text-right" :class="metricTextClass(row.p99Ms >= 5000 ? 'error' : row.p99Ms >= 1000 ? 'warning' : 'ok')">
              {{ fmtMs(row.p99Ms) }}
            </td>
            <td class="px-3 py-2 text-right" :class="metricTextClass(row.status4xx > 0 ? 'warning' : 'ok')">
              {{ row.status4xx }}
            </td>
            <td class="px-3 py-2 text-right" :class="metricTextClass(row.status5xx > 0 ? 'error' : 'ok')">
              {{ row.status5xx }}
            </td>
          </tr>
          <tr v-if="runtime.requestRows.length === 0">
            <td colspan="7" class="px-3 py-8 text-center text-[var(--text-tertiary)]">
              No request metrics yet
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
