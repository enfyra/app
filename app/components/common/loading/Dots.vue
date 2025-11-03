<script setup lang="ts">
const props = withDefaults(defineProps<{
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  type?: 'bounce' | 'pulse' | 'wave';
}>(), {
  size: 'md',
  color: 'purple-500',
  type: 'bounce'
});

const dotSize = computed(() => {
  switch (props.size) {
    case 'sm': return 'w-2 h-2';
    case 'lg': return 'w-4 h-4';
    default: return 'w-3 h-3';
  }
});

const animation = computed(() => {
  switch (props.type) {
    case 'pulse': return 'animate-pulse';
    case 'wave': return 'animate-bounce';
    default: return 'animate-bounce';
  }
});
</script>

<template>
  <div class="flex items-center gap-2">
    <div
      :class="[dotSize, `bg-${color}`, 'rounded-full', animation]"
      :style="{ animationDelay: '0ms' }"
    ></div>
    <div
      :class="[dotSize, `bg-${color}`, 'rounded-full', animation]"
      :style="{ animationDelay: '150ms' }"
    ></div>
    <div
      :class="[dotSize, `bg-${color}`, 'rounded-full', animation]"
      :style="{ animationDelay: '300ms' }"
    ></div>
  </div>
</template>