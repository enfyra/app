<script setup lang="ts">
import {
  getExecutionStatusColor,
  getStepTimelineClass,
  getStepTimelineIcon,
  getStepTimelineIconColor,
} from "~/utils/flow.constants";

const open = defineModel<boolean>({ default: false });

defineProps<{
  selectedExec: any | null;
  parsedError: any;
  execStepTimeline: any[];
  parsedContext: Record<string, any>;
  expandedSteps: Record<string, boolean>;
}>();

const emit = defineEmits<{
  toggleStepResult: [key: string];
  copyStepResult: [value: any];
  rerunExecution: [];
}>();

function formatTime(d: string | null) {
  if (!d) return "-";
  return new Date(d).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
</script>

<template>
  <CommonDrawer v-model="open" direction="right">
    <template #header>
      <div class="flex items-center gap-3 w-full">
        <h3 class="text-lg font-semibold">Execution Detail</h3>
        <UBadge v-if="selectedExec" :color="getExecutionStatusColor(selectedExec.status)" variant="soft">{{ selectedExec.status }}</UBadge>
      </div>
    </template>
    <template #body>
      <div v-if="selectedExec" class="p-4 space-y-4">
        <div class="grid grid-cols-2 gap-3">
          <div class="p-3 rounded-lg bg-[var(--surface-muted)]">
            <p class="text-[10px] uppercase tracking-wide text-[var(--text-tertiary)] mb-1">Status</p>
            <UBadge :color="getExecutionStatusColor(selectedExec.status)" variant="soft">{{ selectedExec.status }}</UBadge>
          </div>
          <div class="p-3 rounded-lg bg-[var(--surface-muted)]">
            <p class="text-[10px] uppercase tracking-wide text-[var(--text-tertiary)] mb-1">Duration</p>
            <p class="text-sm font-mono">{{ selectedExec.duration ? `${selectedExec.duration}ms` : '-' }}</p>
          </div>
          <div class="p-3 rounded-lg bg-[var(--surface-muted)]">
            <p class="text-[10px] uppercase tracking-wide text-[var(--text-tertiary)] mb-1">Started</p>
            <p class="text-xs">{{ formatTime(selectedExec.startedAt) }}</p>
          </div>
          <div class="p-3 rounded-lg bg-[var(--surface-muted)]">
            <p class="text-[10px] uppercase tracking-wide text-[var(--text-tertiary)] mb-1">Completed</p>
            <p class="text-xs">{{ formatTime(selectedExec.completedAt) }}</p>
          </div>
        </div>

        <div v-if="selectedExec.status === 'failed' && selectedExec.currentStep" class="p-3 rounded-lg bg-[var(--state-danger-soft-bg)] border border-[var(--state-danger-outline-border)] space-y-2">
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-alert-circle" class="w-4 h-4 text-[var(--md-error)] flex-shrink-0" />
            <p class="text-sm font-semibold text-[var(--state-danger-soft-text)]">
              Failed at step: <span class="font-bold">{{ selectedExec.currentStep }}</span>
            </p>
          </div>
          <p v-if="parsedError.message" class="text-sm text-[var(--md-error)] break-words pl-6">{{ parsedError.message }}</p>
          <pre v-if="parsedError.stack" class="text-[10px] text-[var(--md-error)]/80 overflow-x-auto max-h-[120px] whitespace-pre-wrap pl-6">{{ parsedError.stack }}</pre>
        </div>

        <div v-else-if="selectedExec.currentStep && selectedExec.status === 'running'" class="p-3 rounded-lg bg-[var(--state-info-soft-bg)] border border-[var(--state-info-outline-border)]">
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-[var(--st-info)] animate-pulse" />
            <p class="text-sm text-[var(--state-info-soft-text)]">Running step: <span class="font-semibold">{{ selectedExec.currentStep }}</span></p>
          </div>
        </div>

        <div v-if="execStepTimeline.length > 0" class="space-y-2">
          <p class="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide">Steps</p>
          <div v-for="s in execStepTimeline" :key="s.key" class="p-2 rounded-lg border" :class="getStepTimelineClass(s)">
            <div class="flex items-center gap-2 cursor-pointer" @click="emit('toggleStepResult', s.key)">
              <UIcon :name="getStepTimelineIcon(s)" class="w-3.5 h-3.5 flex-shrink-0" :class="getStepTimelineIconColor(s)" />
              <span class="text-xs font-medium flex-1" :class="s.status === 'skipped' ? 'text-[var(--text-quaternary)]' : ''">{{ s.key }}</span>
              <UBadge v-if="s.type === 'condition' && s.branch" :color="s.branch === 'true' ? 'success' : 'error'" variant="soft" size="xs">{{ s.branch }}</UBadge>
              <UBadge v-if="s.status === 'skipped'" color="neutral" variant="soft" size="xs">skipped</UBadge>
              <UBadge v-if="s.retries" color="warning" variant="soft" size="xs">{{ s.retries }} retries</UBadge>
              <span v-if="s.duration" class="text-[10px] font-mono text-[var(--text-quaternary)]">{{ s.duration }}ms</span>
              <UIcon v-if="parsedContext[s.key]" :name="expandedSteps[s.key] ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'" class="w-3 h-3 text-[var(--text-quaternary)]" />
            </div>
            <p v-if="s.status === 'skipped' && s.reason" class="text-[10px] text-[var(--text-quaternary)] mt-1 pl-5">{{ s.reason }}</p>
            <pre v-if="expandedSteps[s.key] && parsedContext[s.key]" class="mt-1 p-2 rounded bg-[var(--surface-muted)] text-[10px] font-mono text-[var(--text-tertiary)] overflow-auto max-h-[120px] whitespace-pre-wrap">{{ JSON.stringify(parsedContext[s.key], null, 2) }}</pre>
          </div>
        </div>
        <UButton v-if="selectedExec?.status === 'failed'" color="primary" variant="soft" icon="i-lucide-rotate-ccw" block class="mt-3" @click="emit('rerunExecution')">
          Re-run with same payload
        </UButton>
      </div>
    </template>
  </CommonDrawer>
</template>
