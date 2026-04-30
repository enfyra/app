<script setup lang="ts">
import { fmtMs } from '~/utils/runtime-monitor/format';
import {
  metricTextClass,
} from '~/utils/runtime-monitor/core';
import { databaseSeverity } from '~/utils/runtime-monitor/severity';
import { databaseWarnings } from '~/utils/runtime-monitor/warnings';

type RuntimeMetricsViewModel = ReturnType<typeof useRuntimeMetrics>;

defineProps<{ runtime: RuntimeMetricsViewModel }>();
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
          class="mt-3 rounded-lg border border-warning-400/20 bg-warning-400/5 p-3"
        >
          <div class="flex items-center gap-2 text-sm font-medium text-warning-600 dark:text-warning-400">
            <UIcon name="lucide:triangle-alert" class="h-4 w-4" />
            Database warnings
          </div>
          <ul class="mt-2 space-y-1 text-sm text-[var(--text-secondary)]">
            <li v-for="warning in databaseWarnings(metrics)" :key="warning" class="flex gap-2">
              <span class="text-warning-600 dark:text-warning-400">•</span>
              <span>{{ warning }}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <div class="overflow-x-auto rounded-lg border border-[var(--border-default)]">
      <table class="w-full min-w-[760px] text-sm">
        <thead class="border-b border-[var(--border-default)] text-left text-xs text-[var(--text-tertiary)]">
          <tr>
            <th class="px-3 py-2">Context</th>
            <th class="px-3 py-2">Operation</th>
            <th class="px-3 py-2 text-right">Count</th>
            <th class="px-3 py-2 text-right">Slow</th>
            <th class="px-3 py-2 text-right">Errors</th>
            <th class="px-3 py-2 text-right">Pool timeout</th>
            <th class="px-3 py-2 text-right">p95</th>
            <th class="px-3 py-2 text-right">p99</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-[var(--border-default)]">
          <tr v-for="row in runtime.databaseRows" :key="`${row.context}:${row.op}:${row.table}`">
            <td class="px-3 py-2 text-[var(--text-tertiary)]">{{ row.context }}</td>
            <td class="px-3 py-2">
              <span class="font-medium">{{ row.op }}</span>
              <span class="ml-2 text-[var(--text-tertiary)]">{{ row.table }}</span>
            </td>
            <td class="px-3 py-2 text-right">{{ row.count }}</td>
            <td class="px-3 py-2 text-right" :class="metricTextClass(row.slow > 0 ? 'warning' : 'ok')">
              {{ row.slow }}
            </td>
            <td class="px-3 py-2 text-right" :class="metricTextClass(row.errors > 0 ? 'error' : 'ok')">
              {{ row.errors }}
            </td>
            <td class="px-3 py-2 text-right" :class="metricTextClass(row.poolAcquireTimeouts > 0 ? 'error' : 'ok')">
              {{ row.poolAcquireTimeouts }}
            </td>
            <td class="px-3 py-2 text-right">{{ fmtMs(row.p95Ms) }}</td>
            <td class="px-3 py-2 text-right">{{ fmtMs(row.p99Ms) }}</td>
          </tr>
          <tr v-if="runtime.databaseRows.length === 0">
            <td colspan="8" class="px-3 py-8 text-center text-[var(--text-tertiary)]">
              No query metrics yet
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
