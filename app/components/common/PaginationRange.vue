<script setup lang="ts">
const props = defineProps<{ start: number; end: number }>();
const numberFormat = new Intl.NumberFormat('en-US');
const startLabel = computed(() => numberFormat.format(props.start));
const endLabel = computed(() => numberFormat.format(props.end));
const label = computed(() => props.start > 0 ? `${startLabel.value}–${endLabel.value}` : '0 results');
const stacked = computed(() => label.value.length > 14);
</script>

<template>
  <span class="inline-grid max-w-24 shrink-0 text-right text-xs leading-3 tabular-nums text-muted" :title="label">
    <span class="sr-only">{{ start > 0 ? `Showing ${startLabel} to ${endLabel} results` : label }}</span>
    <template v-if="stacked">
      <span aria-hidden="true" class="truncate">{{ startLabel }}</span>
      <span aria-hidden="true" class="truncate">– {{ endLabel }}</span>
    </template>
    <span v-else aria-hidden="true" class="whitespace-nowrap">{{ label }}</span>
  </span>
</template>
