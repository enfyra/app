<script setup lang="ts">
const props = withDefaults(defineProps<{
  value?: number;
  size?: 'sm' | 'md' | 'lg';
  type?: 'linear' | 'circular';
  color?: string;
  indeterminate?: boolean;
}>(), {
  value: 0,
  size: 'md',
  type: 'linear',
  color: 'purple-500',
  indeterminate: false
});

const progressHeight = computed(() => {
  switch (props.size) {
    case 'sm': return 'h-1';
    case 'lg': return 'h-3';
    default: return 'h-2';
  }
});

const circularSize = computed(() => {
  switch (props.size) {
    case 'sm': return 'w-8 h-8';
    case 'lg': return 'w-16 h-16';
    default: return 'w-12 h-12';
  }
});

const radius = computed(() => {
  switch (props.size) {
    case 'sm': return 14;
    case 'lg': return 28;
    default: return 20;
  }
});

const circumference = computed(() => 2 * Math.PI * radius.value);
const strokeDashoffset = computed(() => 
  props.indeterminate ? 0 : circumference.value - (props.value / 100) * circumference.value
);
</script>

<template>
  <!-- Linear Progress -->
  <div v-if="type === 'linear'" :class="['w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden', progressHeight]">
    <div 
      v-if="indeterminate"
      :class="[progressHeight, `bg-${color}`, 'rounded-full animate-pulse w-1/3']"
      style="animation: progress-indeterminate 2s infinite linear;"
    ></div>
    <div 
      v-else
      :class="[progressHeight, `bg-${color}`, 'rounded-full transition-all duration-300']"
      :style="`width: ${value}%`"
    ></div>
  </div>

  <!-- Circular Progress -->
  <div v-else :class="['relative', circularSize]">
    <svg :class="circularSize" class="transform -rotate-90">
      <!-- Background Circle -->
      <circle
        cx="50%"
        cy="50%"
        :r="radius"
        stroke="currentColor"
        class="text-gray-200 dark:text-gray-700"
        stroke-width="2"
        fill="none"
      />
      <!-- Progress Circle -->
      <circle
        cx="50%"
        cy="50%"
        :r="radius"
        :stroke="color === 'purple-500' ? '#7C3AED' : color"
        stroke-width="2"
        fill="none"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="strokeDashoffset"
        :class="indeterminate ? 'animate-spin' : ''"
        class="transition-all duration-300"
        stroke-linecap="round"
      />
    </svg>
    
    <!-- Percentage Text -->
    <div v-if="!indeterminate" class="absolute inset-0 flex items-center justify-center">
      <span :class="[
        'font-medium',
        size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-sm' : 'text-xs'
      ]">
        {{ Math.round(value) }}%
      </span>
    </div>
  </div>
</template>

<style scoped>
@keyframes progress-indeterminate {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(300%);
  }
}
</style>