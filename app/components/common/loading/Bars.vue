<script setup lang="ts">
const props = withDefaults(defineProps<{
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  count?: number;
}>(), {
  size: 'md',
  color: 'purple-500',
  count: 5
});

const barWidth = computed(() => {
  switch (props.size) {
    case 'sm': return 'w-0.5';
    case 'lg': return 'w-1.5';
    default: return 'w-1';
  }
});

const maxHeight = computed(() => {
  switch (props.size) {
    case 'sm': return 'h-4';
    case 'lg': return 'h-10';
    default: return 'h-6';
  }
});

const bars = computed(() => {
  const heights = ['h-2', 'h-4', 'h-3', 'h-5', 'h-2'];
  return Array.from({ length: props.count }, (_, i) => ({
    height: heights[i % heights.length],
    delay: i * 100
  }));
});
</script>

<template>
  <div class="flex items-end gap-1">
    <div 
      v-for="(bar, index) in bars"
      :key="index"
      :class="[barWidth, bar.height, `bg-${color}`, 'animate-pulse']"
      :style="`animation-delay: ${bar.delay}ms; animation-duration: 1s;`"
    ></div>
  </div>
</template>