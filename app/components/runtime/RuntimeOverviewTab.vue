<script setup lang="ts">
import {
  averageWindowLabel,
  fmtDateTime,
  fmtMb,
  fmtMs,
  fmtNumber,
  fmtPercent,
  fmtSec,
  hardwareCpuLabel,
  hardwareMemoryLabel,
  sampleAgeLabel,
} from '~/utils/runtime-monitor/format';
import {
  metricTextClass,
} from '~/utils/runtime-monitor/core';
import {
  eventLoopSeverity,
  heapSeverity,
  isolateHeapSeverity,
  overviewSeverity,
} from '~/utils/runtime-monitor/severity';
import { overviewWarnings } from '~/utils/runtime-monitor/warnings';

type RuntimeMetricsViewModel = ReturnType<typeof useRuntimeMetrics>;

defineProps<{ runtime: RuntimeMetricsViewModel }>();
</script>

<template>
  <div class="grid gap-4">
    <section v-if="runtime.clusterStats?.enabled" class="surface-card rounded-lg p-4">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-default)] pb-3">
        <div>
          <div class="font-medium text-[var(--text-primary)]">Cluster Instances</div>
          <div class="mt-1 text-xs text-[var(--text-tertiary)]">
            SQL pool coordination heartbeat · stale after {{ fmtSec(runtime.clusterStats.staleAfterMs) }}
          </div>
        </div>
        <RuntimeStatusBadge
          :severity="runtime.clusterSeverity()"
          :messages="runtime.clusterSeverity() === 'warning' ? ['One or more cluster heartbeats are near the stale threshold.'] : []"
          ok-label="Coordinated"
          warning-label="Check samples"
        />
      </div>

      <div class="mt-4 grid gap-3 sm:grid-cols-2">
        <div class="rounded-lg border border-[var(--border-default)] p-3">
          <div class="text-xs font-medium text-[var(--text-tertiary)]">Coordination</div>
          <div class="mt-2 grid grid-cols-2 gap-2 text-sm">
            <div>Active instances</div>
            <div class="text-right font-medium">{{ runtime.clusterStats.activeCount }}</div>
            <div>Heartbeat every</div>
            <div class="text-right font-medium">{{ fmtSec(runtime.clusterStats.heartbeatIntervalMs) }}</div>
            <div>Reconcile every</div>
            <div class="text-right font-medium">{{ fmtSec(runtime.clusterStats.reconcileIntervalMs) }}</div>
          </div>
        </div>

        <div class="rounded-lg border border-[var(--border-default)] p-3">
          <div class="text-xs font-medium text-[var(--text-tertiary)]">SQL Pool Budget</div>
          <div class="mt-2 grid grid-cols-2 gap-2 text-sm">
            <div>DB max connections</div>
            <div class="text-right font-medium">{{ runtime.clusterStats.serverMaxConnections ?? '-' }}</div>
            <div>Reserved</div>
            <div class="text-right font-medium">{{ runtime.clusterStats.reserveConnections ?? '-' }}</div>
            <div>Target / instance</div>
            <div class="text-right font-medium">{{ runtime.clusterStats.targetPoolMax ?? '-' }}</div>
            <div>Last reconciled</div>
            <div class="truncate text-right font-medium">{{ fmtDateTime(runtime.clusterStats.lastReconciledAt) }}</div>
          </div>
        </div>
      </div>

      <div class="mt-4 rounded-lg border border-[var(--border-default)]">
        <div class="border-b border-[var(--border-default)] px-3 py-2 text-xs font-medium text-[var(--text-tertiary)]">
          Heartbeats
        </div>
        <div class="divide-y divide-[var(--border-default)]">
          <div
            v-for="item in runtime.clusterStats.instances"
            :key="item.id"
            class="grid gap-2 px-3 py-2 text-xs sm:grid-cols-[1fr_170px_100px]"
          >
            <div class="truncate font-medium text-[var(--text-primary)]">{{ item.id }}</div>
            <div class="text-[var(--text-tertiary)]">{{ fmtDateTime(item.lastSeenAt) }}</div>
            <div
              class="font-medium"
              :class="metricTextClass(item.ageMs > runtime.clusterStats.staleAfterMs * 0.75 ? 'warning' : 'ok')"
            >
              {{ fmtSec(item.ageMs) }} ago
            </div>
          </div>
        </div>
      </div>
    </section>

    <CommonAnimatedGrid grid-class="grid gap-4">
      <section
        v-for="metrics in runtime.instances"
        :key="metrics.instance.id"
        class="surface-card rounded-lg p-4"
      >
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-default)] pb-3">
        <div class="min-w-0">
          <div class="truncate font-medium text-[var(--text-primary)]">
            {{ metrics.instance.id }}
          </div>
          <div class="mt-1 text-xs text-[var(--text-tertiary)]">
            pid {{ metrics.instance.pid }} · uptime {{ fmtNumber(metrics.instance.uptimeSec / 60, 1) }}m
          </div>
          <div class="mt-1 text-xs text-[var(--text-tertiary)]">
            sampled {{ fmtDateTime(metrics.sampledAt) }} · {{ sampleAgeLabel(metrics) }}
          </div>
          <div class="mt-1 text-xs text-[var(--text-tertiary)]">
            {{ averageWindowLabel(metrics) }} · kept in Redis
          </div>
        </div>
        <RuntimeStatusBadge
          :severity="metrics.health?.overview?.severity ?? overviewSeverity(metrics)"
          :messages="metrics.health?.overview?.messages ?? overviewWarnings(metrics)"
        />
      </div>

      <div
        v-if="overviewWarnings(metrics).length > 0"
        class="mt-3 rounded-lg border border-warning-400/20 bg-warning-400/5 p-3"
      >
        <div class="flex items-center gap-2 text-sm font-medium text-warning-600 dark:text-warning-400">
          <UIcon name="lucide:triangle-alert" class="h-4 w-4" />
          Overview warnings
        </div>
        <ul class="mt-2 space-y-1 text-sm text-[var(--text-secondary)]">
          <li v-for="warning in overviewWarnings(metrics)" :key="warning" class="flex gap-2">
            <span class="text-warning-600 dark:text-warning-400">•</span>
            <span>{{ warning }}</span>
          </li>
        </ul>
      </div>

      <div class="mt-4 grid gap-3 sm:grid-cols-2">
        <div class="rounded-lg border border-[var(--border-default)] p-3">
          <div class="text-xs font-medium text-[var(--text-tertiary)]">Hardware / Tuning</div>
          <div class="mt-2 grid grid-cols-2 gap-2 text-sm">
            <div>Allocated RAM</div>
            <div class="text-right font-medium">{{ hardwareMemoryLabel(metrics) }}</div>
            <div>Allocated CPU</div>
            <div class="text-right font-medium">{{ hardwareCpuLabel(metrics) }}</div>
            <div>Workers</div>
            <div class="text-right font-medium">{{ metrics.executor.tuning.maxConcurrentWorkers }}</div>
            <div>Isolate limit</div>
            <div class="text-right font-medium">{{ fmtMb(metrics.executor.tuning.isolateMemoryLimitMb) }}</div>
            <div>Task cap</div>
            <div class="text-right font-medium">{{ metrics.executor.tuning.tasksPerWorkerCap }} / worker</div>
            <div>Warm isolates</div>
            <div class="text-right font-medium">{{ metrics.executor.tuning.isolatePoolSize }} / worker</div>
          </div>
        </div>

        <div class="rounded-lg border border-[var(--border-default)] p-3">
          <div class="text-xs font-medium text-[var(--text-tertiary)]">Memory</div>
          <div class="mt-2 grid grid-cols-2 gap-2 text-sm">
            <div>RSS</div>
            <div class="text-right font-medium">{{ fmtMb(metrics.instance.rssMb) }}</div>
            <div>RSS avg</div>
            <div class="text-right font-medium">{{ fmtMb(metrics.averages?.rssMb ?? metrics.instance.rssMb) }}</div>
            <div>Heap</div>
            <div class="text-right font-medium" :class="metricTextClass(heapSeverity(metrics))">
              {{ fmtMb(metrics.instance.heapUsedMb) }} / {{ fmtMb(metrics.instance.heapTotalMb) }}
            </div>
            <div>Heap avg</div>
            <div class="text-right font-medium">{{ fmtMb(metrics.averages?.heapUsedMb ?? metrics.instance.heapUsedMb) }}</div>
            <div>Isolate heap</div>
            <div class="text-right font-medium" :class="metricTextClass(isolateHeapSeverity(metrics))">
              {{ fmtPercent(metrics.executor.maxHeapRatio) }}
            </div>
            <div>Isolate avg</div>
            <div class="text-right font-medium">
              {{ fmtPercent(metrics.averages?.executorMaxHeapRatio ?? metrics.executor.maxHeapRatio) }}
            </div>
            <div>Event loop</div>
            <div class="text-right font-medium" :class="metricTextClass(eventLoopSeverity(metrics))">
              {{ fmtMs(metrics.instance.eventLoopLagMs) }}
            </div>
            <div>Event loop avg</div>
            <div class="text-right font-medium">
              {{ fmtMs(metrics.averages?.eventLoopLagMs ?? metrics.instance.eventLoopLagMs) }}
            </div>
          </div>
        </div>
      </div>
      </section>
    </CommonAnimatedGrid>
  </div>
</template>
