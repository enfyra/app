<script setup lang="ts">
import { getExecutionStatusColor, getExecutionStatusDotClass } from "~/utils/flow.constants";

defineProps<{
  executions: any[];
  hasMore: boolean;
  loading: boolean;
}>();

const emit = defineEmits<{
  refresh: [];
  loadMore: [];
  open: [execution: any];
}>();

function formatTime(d: string | null) {
  if (!d) return "-";
  return new Date(d).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
</script>

<template>
  <CommonFormCard>
    <template #header>
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold text-[var(--text-primary)]">Recent Executions</h3>
        <UButton
          icon="i-lucide-refresh-cw"
          size="sm"
          variant="solid"
          color="neutral"
          :loading="loading"
          @click="emit('refresh')"
        >
          Reload
        </UButton>
      </div>
    </template>
    <div v-if="executions.length > 0" class="space-y-2 p-4">
      <div
        v-for="exec in executions"
        :key="exec.id"
        class="flex items-center justify-between p-3 bg-[var(--surface-muted)] rounded-lg text-sm cursor-pointer hover:bg-[var(--surface-muted)] transition-colors"
        @click="emit('open', exec)"
      >
        <div class="flex items-center gap-3">
          <span class="w-2 h-2 rounded-full flex-shrink-0" :class="getExecutionStatusDotClass(exec.status)" />
          <UBadge :color="getExecutionStatusColor(exec.status)" variant="soft" size="xs">{{ exec.status }}</UBadge>
          <span class="text-[var(--text-tertiary)] text-xs">{{ formatTime(exec.startedAt) }}</span>
        </div>
        <div class="flex items-center gap-2">
          <span v-if="exec.duration" class="text-[var(--text-quaternary)] text-xs font-mono">{{ exec.duration }}ms</span>
          <UIcon name="i-lucide-chevron-right" class="w-4 h-4 text-[var(--text-quaternary)]" />
        </div>
      </div>
    </div>
    <div v-if="hasMore && executions.length > 0" class="px-4 pb-4">
      <UButton variant="ghost" color="neutral" block :loading="loading" @click="emit('loadMore')">
        Load More
      </UButton>
    </div>
    <p v-else-if="executions.length === 0" class="text-sm text-[var(--text-quaternary)] text-center py-8">
      No executions yet. Click "Run Now" to trigger this flow.
    </p>
  </CommonFormCard>
</template>
