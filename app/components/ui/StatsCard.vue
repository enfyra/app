<template>
  <UiModernCard
    variant="stats"
    animated
    size="compact"
    :class="className"
    v-bind="$attrs"
  >
    <div class="flex items-start justify-between gap-2">
      <div class="flex-1 min-w-0">
        <div class="text-2xl font-semibold mb-1 text-gray-800 dark:text-white/90">
          {{ value }}
        </div>
        <div class="text-sm text-gray-500 dark:text-gray-400">
          {{ label }}
        </div>
        <div
          v-if="trend"
          :class="['text-xs mt-1', trendColor]"
        >
          {{ trend.value }}
        </div>
      </div>
      <div
        v-if="$slots.icon"
        class="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-gray-50 dark:bg-gray-900"
      >
        <slot name="icon" />
      </div>
    </div>
  </UiModernCard>
</template>

<script setup lang="ts">
/**
 * STATS CARD - Compact card for displaying metrics
 *
 * Features:
 * - Compact size optimized for grids
 * - Optional icon with background
 * - Trend indicator with color coding
 * - Hover lift animation
 */

interface Trend {
  value: string;
  direction: "up" | "down" | "neutral";
}

interface Props {
  label: string;
  value: string | number;
  trend?: Trend;
  className?: string;
}

const props = withDefaults(defineProps<Props>(), {
  trend: undefined,
  className: "",
});

const trendColor = computed(() => {
  if (!props.trend) return undefined;

  const colors = {
    up: "text-success-600 dark:text-success-500",
    down: "text-error-600 dark:text-error-500",
    neutral: "text-gray-500 dark:text-gray-400",
  };

  return colors[props.trend.direction];
});
</script>
