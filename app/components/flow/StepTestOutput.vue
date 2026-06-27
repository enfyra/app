<template>
  <div v-if="value !== undefined" class="space-y-1">
    <div class="flex items-center justify-between gap-2">
      <div class="text-xs font-medium text-[var(--text-tertiary)]">{{ title }}</div>
      <UButton size="xs" variant="ghost" icon="i-lucide-copy" @click="emit('copy', value)">Copy</UButton>
    </div>
    <pre class="max-h-[220px] cursor-text select-text overflow-auto whitespace-pre-wrap rounded-[var(--radius-panel)] border border-[var(--border-default)] bg-[var(--surface-muted)] p-3 font-mono text-xs text-[var(--text-secondary)]">{{ formattedValue }}</pre>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  title: string;
  value: any;
}>();

const emit = defineEmits<{
  copy: [value: any];
}>();

const formattedValue = computed(() => typeof props.value === 'string' ? props.value : JSON.stringify(props.value, null, 2));
</script>
